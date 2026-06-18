import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripInput, Itinerary, User } from '../types';
import {
  syncTripToCloud, removeTripFromCloud,
  fetchTripsFromCloud, mergeTrips,
} from '../lib/firestoreSync';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const SAVED_TRIPS_KEY   = '@familyquest/saved_trips';
const DAILY_COUNT_KEY   = '@familyquest/daily_count';
const DAILY_COUNT_DATE  = '@familyquest/daily_count_date';

// ─── Date reviver for JSON.parse (restores Date objects from ISO strings) ─────
function reviveItinerary(raw: any): Itinerary {
  return {
    ...raw,
    generatedAt: new Date(raw.generatedAt),
    tripInput: {
      ...raw.tripInput,
      startDate: new Date(raw.tripInput.startDate),
      endDate:   new Date(raw.tripInput.endDate),
    },
  };
}

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthState {
  user:       User | null;
  isLoading:  boolean;
  setUser:    (user: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:       null,
  isLoading:  true,
  setUser:    (user)      => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ─── Trip Store ───────────────────────────────────────────────────────────────
interface TripState {
  currentInput:          Partial<TripInput>;
  currentItinerary:      Itinerary | null;
  isGenerating:          boolean;
  savedTrips:            Itinerary[];
  dailyGenerationCount:  number;

  setInput:           (input: Partial<TripInput>) => void;
  setItinerary:       (itinerary: Itinerary | null) => void;
  setGenerating:      (v: boolean) => void;
  bumpDailyCount:     () => void;
  loadDailyCount:     () => Promise<void>;
  saveTrip:           (itinerary: Itinerary, uid?: string | null) => Promise<void>;
  deleteTrip:         (id: string, uid?: string | null) => Promise<void>;
  loadSavedTrips:     () => Promise<void>;
  syncFromCloud:      (uid: string) => Promise<void>;
  resetInput:         () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  currentInput:         {},
  currentItinerary:     null,
  isGenerating:         false,
  savedTrips:           [],
  dailyGenerationCount: 0,

  setInput: (input) =>
    set((s) => ({ currentInput: { ...s.currentInput, ...input } })),

  setItinerary: (itinerary) => set({ currentItinerary: itinerary }),

  setGenerating: (isGenerating) => set({ isGenerating }),

  // ── Daily generation counter (resets each calendar day) ──────────────────
  bumpDailyCount: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const newCount = get().dailyGenerationCount + 1;
    set({ dailyGenerationCount: newCount });
    try {
      await AsyncStorage.setItem(DAILY_COUNT_KEY,  String(newCount));
      await AsyncStorage.setItem(DAILY_COUNT_DATE, today);
    } catch (_) {}
  },

  loadDailyCount: async () => {
    try {
      const today    = new Date().toISOString().slice(0, 10);
      const savedDay = await AsyncStorage.getItem(DAILY_COUNT_DATE);
      if (savedDay !== today) {
        // New day — reset counter
        set({ dailyGenerationCount: 0 });
        await AsyncStorage.setItem(DAILY_COUNT_KEY,  '0');
        await AsyncStorage.setItem(DAILY_COUNT_DATE, today);
        return;
      }
      const raw = await AsyncStorage.getItem(DAILY_COUNT_KEY);
      set({ dailyGenerationCount: raw ? parseInt(raw, 10) : 0 });
    } catch (_) {}
  },

  // ── Save a trip — local-first (instant), then mirrors to cloud if signed in ──
  saveTrip: async (itinerary, uid) => {
    const current = get().savedTrips;
    if (current.some(t => t.id === itinerary.id)) return;
    const updated = [itinerary, ...current];
    set({ savedTrips: updated });
    try {
      await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated));
    } catch (_) {}
    if (uid) syncTripToCloud(uid, itinerary); // fire-and-forget, fails silently offline
  },

  // ── Delete a saved trip — local-first, mirrors deletion to cloud ─────────
  deleteTrip: async (id, uid) => {
    const updated = get().savedTrips.filter(t => t.id !== id);
    set({ savedTrips: updated });
    try {
      await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(updated));
    } catch (_) {}
    if (uid) removeTripFromCloud(uid, id);
  },

  // ── Load saved trips from AsyncStorage on app start (instant, offline-safe) ──
  loadSavedTrips: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_TRIPS_KEY);
      if (!raw) return;
      const parsed: any[] = JSON.parse(raw);
      const trips = parsed.map(reviveItinerary);
      set({ savedTrips: trips });
    } catch (_) {}
  },

  // ── Pull cloud trips and merge with local on sign-in (cross-device sync) ──
  syncFromCloud: async (uid) => {
    const cloudTrips = await fetchTripsFromCloud(uid);
    if (cloudTrips.length === 0) return;
    const merged = mergeTrips(get().savedTrips, cloudTrips);
    set({ savedTrips: merged });
    try {
      await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(merged));
    } catch (_) {}
  },

  resetInput: () => set({ currentInput: {} }),
}));
