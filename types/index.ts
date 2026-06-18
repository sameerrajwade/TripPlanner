export type Vibe =
  | 'Hiking'
  | 'Foodie'
  | 'Kid-Friendly'
  | 'Museums'
  | 'Beach'
  | 'Adventure'
  | 'Shopping'
  | 'Nature'
  | 'History'
  | 'Relaxation'
  | 'Nightlife'
  | 'Photography';

export type AccessibilityNeed = 'wheelchair' | 'stroller' | 'limited_mobility';

export type TripPace = 'relaxed' | 'balanced' | 'packed';
export type BudgetLevel = 'budget' | 'mid-range' | 'luxury';
export type DietaryNeed = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free' | 'nut-free' | 'dairy-free';
export type CuisinePreference = 'Italian' | 'Asian' | 'Mexican' | 'Mediterranean' | 'American' | 'Indian' | 'Japanese' | 'Middle Eastern' | 'French' | 'Local';

export interface TripInput {
  destination: string;
  startDate: Date;
  endDate: Date;
  adults: number;
  kids: number;
  kidAges: number[];
  accessibility: AccessibilityNeed[];
  vibes: Vibe[];
  includeDining: boolean;
  pace: TripPace;
  budget: BudgetLevel;
  stayLocation?: string;       // e.g. "Eixample district, Barcelona" (optional)
  dietaryNeeds: DietaryNeed[]; // e.g. ['vegetarian', 'halal']
  cuisinePrefs: CuisinePreference[]; // e.g. ['Italian', 'Asian']
}

export interface Activity {
  time: string;           // e.g. "9:00 AM"
  title: string;
  description: string;
  duration: string;       // e.g. "2 hours"
  category: 'activity' | 'transit' | 'rest';
  accessibilityNotes?: string;
  tips?: string;
  cost?: string;          // e.g. "~$15/person" or "Free"
  isOutdoor?: boolean;
  indoorAlternative?: string; // backup plan if weather is bad
}

export interface WeatherDay {
  date: string;           // YYYY-MM-DD
  tempMax: number;        // °C
  tempMin: number;        // °C
  rainChance: number;     // 0-100
  description: string;   // e.g. "Partly cloudy", "Heavy rain"
  icon: string;           // emoji e.g. "⛅"
  _wmoCode?: number;      // raw WMO code for alert classification
}

export interface DiningOption {
  name: string;
  cuisine: string;        // e.g. "Catalan tapas"
  why: string;            // why locals love it + how it fits dietary/cuisine prefs
  cost: string;           // e.g. "~$15/person"
  dietaryTags: string[];  // e.g. ["Vegetarian", "Halal"]
}

export interface DiningSpot {
  meal: 'breakfast' | 'lunch' | 'dinner' | 'coffee';
  nearActivity: string;   // name of nearest activity in the day
  options: DiningOption[]; // 2-3 options to choose from
}

export interface DayPlan {
  day: number;
  date: string;           // e.g. "Monday, June 9"
  theme: string;          // e.g. "Arrival & Old Town Exploration"
  activities: Activity[];
  diningSpots?: DiningSpot[];
}

export interface Itinerary {
  id: string;
  destination: string;
  destinationImageQuery: string;  // keyword for Unsplash query
  heroEmoji: string;              // destination-specific emoji e.g. "🗼" for Paris
  tripInput: TripInput;
  days: DayPlan[];
  highlights: string[];
  packingTips: string[];
  generatedAt: Date;
  weather?: WeatherDay[];         // fetched client-side after generation
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

export interface SavedTrip {
  id: string;
  destination: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  days: number;
  createdAt: Date;
}
