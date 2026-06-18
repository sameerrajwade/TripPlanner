import functions from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripInput, Itinerary, DayPlan, Activity } from '../types';

// ─── Stable per-device identifier for guest rate limiting ─────────────────────
// App Check isn't enabled on the backend yet, so the Cloud Function can't rely
// on request.app.appId to bucket guests individually — it would collapse to a
// single shared "anon" counter for every guest on the planet. Instead we mint
// a random UUID once per install, persist it, and send it explicitly so each
// device gets its own daily quota.
const DEVICE_ID_KEY = 'familyquest_device_id';
let cachedDeviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch {
    // Storage unavailable — fall back to a per-session random id rather than
    // crashing or sharing a global bucket.
    cachedDeviceId = `dev-session-${Math.random().toString(36).slice(2, 12)}`;
    return cachedDeviceId;
  }
}

// ─── Always use production Firebase Functions ──────────────────────────────────
// useEmulator('localhost', 5001) only works inside an Android emulator where
// localhost resolves to 10.0.2.2 (the host machine). On a real device
// localhost means the device itself — nothing is listening there.

// ─── Type for what we send to the Cloud Function ──────────────────────────────
interface GenerateItineraryPayload {
  deviceId:      string;
  destination:   string;
  startDate:     string;
  endDate:       string;
  adults:        number;
  kids:          number;
  kidAges:       number[];
  accessibility: string[];
  vibes:         string[];
  includeDining: boolean;
  pace:          string;
  budget:        string;
  stayLocation?: string;
  dietaryNeeds:  string[];
  cuisinePrefs:  string[];
}

// ─── Type for what the Cloud Function returns ─────────────────────────────────
interface GenerateItineraryResult {
  success:   boolean;
  itinerary: {
    destination:          string;
    destinationImageQuery:string;
    heroEmoji:            string;
    days:                 DayPlan[];
    highlights:           string[];
    packingTips:          string[];
    generatedAt:          string;
  };
}

// ─── Main API call ─────────────────────────────────────────────────────────────
export async function generateItinerary(input: TripInput): Promise<Itinerary> {
  const deviceId = await getDeviceId();
  const payload: GenerateItineraryPayload = {
    deviceId,
    destination:   input.destination,
    startDate:     input.startDate.toISOString().split('T')[0],
    endDate:       input.endDate.toISOString().split('T')[0],
    adults:        input.adults,
    kids:          input.kids,
    kidAges:       input.kidAges,
    accessibility: input.accessibility,
    vibes:         input.vibes,
    includeDining: input.includeDining,
    pace:          input.pace,
    budget:        input.budget,
    stayLocation:  input.stayLocation,
    dietaryNeeds:  input.dietaryNeeds,
    cuisinePrefs:  input.cuisinePrefs,
  };

  const callable = functions().httpsCallable<GenerateItineraryPayload, GenerateItineraryResult>(
    'generateItinerary',
    { timeout: 110000 }, // matches backend's 120s budget incl. retries on transient 503s
  );

  const { data } = await callable(payload);

  if (!data.success || !data.itinerary) {
    throw new Error('Invalid response from AI service.');
  }

  // ── Map raw response to our full Itinerary type ──────────────────────────
  const raw = data.itinerary;

  const itinerary: Itinerary = {
    id:                   `trip-${Date.now()}`,
    destination:          raw.destination,
    destinationImageQuery:raw.destinationImageQuery,
    heroEmoji:            raw.heroEmoji ?? '✈️',
    tripInput:            input,
    days:                 normaliseDays(raw.days),
    highlights:           raw.highlights ?? [],
    packingTips:          raw.packingTips ?? [],
    generatedAt:          new Date(raw.generatedAt),
  };

  return itinerary;
}

// ─── Normalise days — defensive against minor AI schema drift ─────────────────
function normaliseDays(rawDays: any[]): DayPlan[] {
  return rawDays.map((d: any, i: number) => ({
    day:         typeof d.day === 'number' ? d.day : i + 1,
    date:        d.date ?? `Day ${i + 1}`,
    theme:       d.theme ?? '',
    activities:  Array.isArray(d.activities) ? d.activities.map(normaliseActivity) : [],
    diningSpots: Array.isArray(d.diningSpots) ? d.diningSpots : undefined,
  }));
}

function normaliseActivity(a: any): Activity {
  return {
    time:               a.time        ?? '9:00 AM',
    title:              a.title       ?? 'Activity',
    description:        a.description ?? '',
    duration:           a.duration    ?? '1 hour',
    category:           ['activity', 'transit', 'rest'].includes(a.category)
                          ? a.category : 'activity',
    accessibilityNotes: a.accessibilityNotes,
    tips:               a.tips,
    cost:               a.cost,
    isOutdoor:          a.isOutdoor ?? false,
    indoorAlternative:  a.indoorAlternative,
  };
}

// ─── Error classifier — maps Firebase error codes to user-friendly messages ───
export function getApiErrorMessage(err: any): string {
  const code = err?.code ?? '';

  if (code === 'functions/resource-exhausted') {
    return 'Our AI is taking a quick break. Please try again in a moment.';
  }
  if (code === 'functions/invalid-argument') {
    return 'Please check your trip details and try again.';
  }
  if (code === 'functions/unavailable' || code === 'functions/internal') {
    return 'Something went wrong generating your itinerary. Please try again.';
  }
  if (code === 'functions/deadline-exceeded') {
    return 'The AI took too long. Try a shorter trip or fewer options.';
  }
  // Network error
  if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
    return 'No internet connection. Please check your connection and try again.';
  }

  return 'Could not generate itinerary. Please try again.';
}
