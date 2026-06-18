const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// ─── Server-side daily rate limit (defense against quota abuse) ──────────────
// Keyed by auth uid when signed in, otherwise by App Check token subject.
// Free tier: 1,500 Gemini requests/day total — this caps any single
// user/device well below that so one bad actor can't exhaust the shared quota.
const DAILY_LIMIT_SIGNED_IN = 15;
const DAILY_LIMIT_GUEST     = 5;

async function checkAndIncrementRateLimit(key, limit) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ref = db.collection('rateLimits').doc(`${key}_${today}`);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const count = doc.exists ? (doc.data().count || 0) : 0;

    if (count >= limit) return false; // limit exceeded

    tx.set(ref, {
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return true;
  });
}

// ─── Strip characters/phrases commonly used in prompt injection attempts ─────
function sanitisePromptField(value, maxLen) {
  return String(value)
    .replace(/[<>{}[\]`]/g, '')
    .replace(/\b(ignore|disregard)\b.{0,20}\b(previous|above|all|prior)?\b.{0,10}\b(instructions?|prompt|rules)\b/gi, '')
    .trim()
    .slice(0, maxLen);
}

// ─── Gemini client (key stored in Firebase secret manager) ────────────────────
// Set via: firebase functions:secrets:set GEMINI_API_KEY
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpsError('internal', 'Gemini API key not configured.');
  return new GoogleGenerativeAI(apiKey);
};

// ─── Strict JSON schema for the itinerary output ──────────────────────────────
// Gemini 2.5 Flash enforces this exactly — no hallucinated fields, no missing keys
const ITINERARY_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    destination: { type: SchemaType.STRING },
    destinationImageQuery: {
      type: SchemaType.STRING,
      description: 'Short keyword query for Unsplash image API, e.g. "barcelona spain architecture"',
    },
    heroEmoji: {
      type: SchemaType.STRING,
      description: 'A single emoji that best represents this destination. E.g. 🗼 for Paris, 🏯 for Japan, 🌺 for Bali, 🏖️ for a beach destination, 🏔️ for mountains. Must be exactly one emoji character.',
    },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day:   { type: SchemaType.NUMBER },
          date:  { type: SchemaType.STRING, description: 'e.g. "Monday, July 10"' },
          theme: { type: SchemaType.STRING, description: 'Short evocative theme for the day, e.g. "Arrival & Old Town"' },
          activities: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                time:        { type: SchemaType.STRING, description: 'e.g. "9:00 AM"' },
                title:       { type: SchemaType.STRING },
                description: { type: SchemaType.STRING, description: 'Rich 2-3 sentence description with context' },
                duration:    { type: SchemaType.STRING, description: 'e.g. "2 hours"' },
                category:    { type: SchemaType.STRING, enum: ['activity', 'transit', 'rest'] },
                accessibilityNotes: { type: SchemaType.STRING, description: 'Specific stroller/wheelchair/mobility info. Required if group has accessibility needs.' },
                tips:  { type: SchemaType.STRING, description: 'Insider tip, best time to go, etc.' },
                cost:  { type: SchemaType.STRING, description: 'e.g. "~$15/person", "Free", "Hotel"' },
                isOutdoor: { type: SchemaType.BOOLEAN, description: 'True if this activity takes place primarily outdoors.' },
                indoorAlternative: { type: SchemaType.STRING, description: 'If isOutdoor is true: a specific nearby indoor alternative for this time slot in case of rain. E.g. "If it rains: visit the Picasso Museum (10 min walk) instead — same neighbourhood, great for kids." Leave empty for indoor activities.' },
              },
              required: ['time', 'title', 'description', 'duration', 'category'],
            },
          },
          diningSpots: {
            type: SchemaType.ARRAY,
            description: 'Supplementary dining suggestions per meal slot. Each slot has 2-3 options matching dietary/cuisine preferences.',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                meal:         { type: SchemaType.STRING, enum: ['breakfast', 'lunch', 'dinner', 'coffee'] },
                nearActivity: { type: SchemaType.STRING, description: 'Name of the nearest activity in this day\'s itinerary' },
                options: {
                  type: SchemaType.ARRAY,
                  description: '2-3 restaurant/café options for this meal slot',
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      name:         { type: SchemaType.STRING },
                      cuisine:      { type: SchemaType.STRING, description: 'e.g. "Catalan tapas", "Vietnamese street food"' },
                      why:          { type: SchemaType.STRING, description: 'Why locals love it + how it fits dietary/cuisine preferences. 1-2 sentences.' },
                      cost:         { type: SchemaType.STRING, description: 'e.g. "~$12/person"' },
                      dietaryTags:  { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Applicable dietary labels e.g. ["Vegetarian", "Halal"]' },
                    },
                    required: ['name', 'cuisine', 'why', 'cost', 'dietaryTags'],
                  },
                },
              },
              required: ['meal', 'nearActivity', 'options'],
            },
          },
        },
        required: ['day', 'date', 'theme', 'activities', 'diningSpots'],
      },
    },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '4-5 bullet highlights of the whole trip',
    },
    packingTips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: '4-6 destination-specific packing tips',
    },
  },
  required: ['destination', 'destinationImageQuery', 'heroEmoji', 'days', 'highlights', 'packingTips'],
};

// ─── Build the prompt dynamically from user inputs ────────────────────────────
function buildPrompt(input) {
  const {
    destination, startDate, endDate, adults, kids,
    kidAges, accessibility, vibes, includeDining,
    pace = 'balanced', budget = 'mid-range',
    stayLocation = '',
    dietaryNeeds = [], cuisinePrefs = [],
  } = input;

  const start   = new Date(startDate);
  const end     = new Date(endDate);
  const numDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

  // ── Pace directive (compact) ───────────────────────────────────────────────
  const paceDirective = {
    relaxed:  '2-3 activities/day. Generous gaps. Max 1 major attraction/day. Rest = café/park/stroll, never hotel room.',
    balanced: '4-5 activities/day. Mix high/low-energy. ~30min transit buffer between spots. Max 2 long (2h+) activities back-to-back.',
    packed:   '6-8 activities/day. Start 8:30AM. Efficient routing. Keep descriptions tight.',
  }[pace] || '4-5 activities/day.';

  // ── Budget directive (compact) ─────────────────────────────────────────────
  const budgetDirective = {
    budget:    'Free/cheap priority: parks, markets, street food. Note costs + flag free alternatives. No private tours or fine dining.',
    'mid-range': 'Mix free and moderate. Comfortable restaurants. One occasional splurge (guided tour etc.) is fine.',
    luxury:    'Premium throughout: private guides, acclaimed restaurants, exclusive access. Cost is no object.',
  }[budget] || 'Mid-range budget.';

  // ── Accessibility ──────────────────────────────────────────────────────────
  const accessConstraints = [];
  if (accessibility.includes('stroller'))        accessConstraints.push('stroller-friendly (paved paths, ramps, elevators)');
  if (accessibility.includes('wheelchair'))       accessConstraints.push('fully wheelchair accessible (ramps, accessible restrooms)');
  if (accessibility.includes('limited_mobility')) accessConstraints.push('limited mobility (minimal walking, rest stops, no steep hills)');

  const accessInstruction = accessConstraints.length > 0
    ? `Every activity MUST satisfy: ${accessConstraints.join('; ')}. Add accessibilityNotes to every activity confirming compliance. Exclude or replace inaccessible venues.`
    : 'None.';

  // ── Kids ───────────────────────────────────────────────────────────────────
  const hasToddlers = kidAges.some(a => a <= 3);
  const kidContext = kids > 0
    ? `${kids} child${kids > 1 ? 'ren' : ''} aged ${kidAges.join(', ')}. Max 3h per activity. ${hasToddlers ? 'One mid-afternoon rest stop (café/playground) for toddlers.' : 'No mandatory rest.'} Flag age restrictions.`
    : 'Adults only.';

  // ── Stay / base location ───────────────────────────────────────────────────
  const stayInstruction = stayLocation
    ? `Group stays near "${stayLocation}". Route each day from this base — include travel time to first/last activity and mention base in transit notes.`
    : 'No fixed base — cluster activities by neighbourhood.';

  // ── Dining (compact, no undefined variables) ───────────────────────────────
  const dietaryStr      = dietaryNeeds.length > 0 ? dietaryNeeds.join(', ') : 'none';
  const cuisineStr      = cuisinePrefs.length  > 0 ? cuisinePrefs.join(', ') : 'best local options';
  const budgetDiningStr = budget === 'budget' ? 'cheap spots, markets, street food' : budget === 'luxury' ? 'acclaimed/chef-driven' : 'neighbourhood favourites, mid-range';

  const diningInstruction = includeDining
    ? `CRITICAL: NEVER put meals/restaurants in the "activities" array. All dining lives in "diningSpots" only.
- 3 slots/day: breakfast (~8:30AM), lunch (~12:30PM), dinner (~7PM).
- Each slot: 2-3 options. LOCAL FAVOURITES ONLY — neighbourhood institutions, hidden gems, family-run spots. No chains, no hotel restaurants, no tourist traps.
- Dietary: ${dietaryStr} — every option must comply with ALL restrictions listed.
- Cuisine pref: ${cuisineStr}.
- Budget: ${budgetDiningStr}.
- "why" field: explain why locals love it + what makes it special (signature dish, history, neighbourhood rep).
- dietaryTags: label each option (e.g. ["Vegetarian", "Halal"]).`
    : 'No dining spots — leave diningSpots array empty for every day.';

  // ── Vibes ──────────────────────────────────────────────────────────────────
  const vibeInstruction = vibes.length > 0
    ? `Requested: ${vibes.join(', ')}. Include ≥1 concrete activity per vibe (named trail for Hiking, specific market for Foodie, etc.). If a vibe is impossible at this destination, say so in highlights and offer the closest alternative — never silently skip or water it down.`
    : '';

  return `Family travel planner. Deep local knowledge. Specific, practical, warm — like a trusted friend who knows the destination personally.

TRIP: ${destination} | ${startDate} → ${endDate} (${numDays}d)
GROUP: ${adults} adult${adults > 1 ? 's' : ''} + ${kidContext}
BASE: ${stayInstruction}
PACE: ${paceDirective}
BUDGET: ${budgetDirective}
ACCESS: ${accessInstruction}
DINING: ${diningInstruction}
${vibeInstruction ? `VIBES: ${vibeInstruction}` : ''}

RULES:
1. Geographically logical — cluster by neighbourhood/area. Never crisscross the city needlessly.
2. Realistic timing. First activity ≥9AM (8:30AM packed). Include transit time between spots.
3. Costs realistic for destination + budget level (not US prices in Southeast Asia).
4. Tips = genuine insider knowledge. No generic advice ("wear comfortable shoes").
5. Day theme: specific + evocative ("Sagrada Família & Gothic Quarter", not "Sightseeing").
6. Every outdoor activity: isOutdoor=true + specific named indoorAlternative nearby.
7. heroEmoji: one emoji that instantly evokes this destination.

Generate a complete ${numDays}-day itinerary for ${destination}.`;
}

// ─── Main Cloud Function ───────────────────────────────────────────────────────
exports.generateItinerary = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
    secrets: ['GEMINI_API_KEY'],
    // Allow unauthenticated calls so guests can generate too —
    // abuse is mitigated below via per-user/per-device daily rate limiting.
    // NOTE: enable App Check enforcement once a provider (Play Integrity / DeviceCheck)
    // is registered for this Firebase project — add `enforceAppCheck: true` here then.
    cors: true,
  },
  async (request) => {
    const input = request.data;

    // ── Rate limiting (server-side, Firestore-transaction based) ────────────
    // Signed-in users are limited per-uid; guests are limited per App Check
    // app-instance token (falls back to a shared bucket if neither is present).
    const uid = request.auth?.uid;
    // App Check isn't enforced yet, so request.app is always undefined for
    // guests — relying on it would bucket every guest on Earth into one
    // shared "anon" counter. Use the client-supplied per-install deviceId
    // instead (sanitised + length-capped to prevent abuse as a free-form key).
    const rawDeviceId = typeof request.data?.deviceId === 'string' ? request.data.deviceId : '';
    const deviceId = rawDeviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'anon';
    const limitKey = uid ? `uid_${uid}` : `guest_${deviceId}`;
    const limit = uid ? DAILY_LIMIT_SIGNED_IN : DAILY_LIMIT_GUEST;
    const allowed = await checkAndIncrementRateLimit(limitKey, limit);
    console.log(`[itinerary] limitKey=${limitKey} limit=${limit} allowed=${allowed} rawDeviceId=${JSON.stringify(rawDeviceId)} dataKeys=${JSON.stringify(Object.keys(input || {}))}`);
    if (!allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily generation limit reached (${limit}/day). Please try again tomorrow${uid ? '' : ' or sign in for a higher limit'}.`,
      );
    }

    // ── Input validation ────────────────────────────────────────────────────
    if (!input.destination || typeof input.destination !== 'string') {
      console.warn('[itinerary] validation failed: destination missing/invalid', JSON.stringify(input));
      throw new HttpsError('invalid-argument', 'destination is required.');
    }
    if (!input.startDate || !input.endDate) {
      console.warn('[itinerary] validation failed: dates missing', JSON.stringify({ startDate: input.startDate, endDate: input.endDate }));
      throw new HttpsError('invalid-argument', 'startDate and endDate are required.');
    }
    if (input.destination.trim().length < 2) {
      console.warn('[itinerary] validation failed: destination too short', JSON.stringify(input.destination));
      throw new HttpsError('invalid-argument', 'destination must be at least 2 characters.');
    }

    // ── Sanitise inputs ─────────────────────────────────────────────────────
    const VALID_PACE     = ['relaxed', 'balanced', 'packed'];
    const VALID_BUDGET   = ['budget', 'mid-range', 'luxury'];
    const VALID_DIETARY  = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'nut-free', 'dairy-free'];
    const VALID_CUISINE  = ['Italian', 'Asian', 'Mexican', 'Mediterranean', 'American', 'Indian', 'Japanese', 'Middle Eastern', 'French', 'Local'];

    const sanitised = {
      destination:   sanitisePromptField(input.destination, 100),
      startDate:     input.startDate,
      endDate:       input.endDate,
      adults:        Math.max(1, Math.min(10, Number(input.adults) || 2)),
      kids:          Math.max(0, Math.min(8,  Number(input.kids)   || 0)),
      kidAges:       Array.isArray(input.kidAges) ? input.kidAges.slice(0, 8) : [],
      accessibility: Array.isArray(input.accessibility) ? input.accessibility : [],
      vibes:         Array.isArray(input.vibes) ? input.vibes.slice(0, 8) : ['Kid-Friendly'],
      includeDining: Boolean(input.includeDining !== false),
      pace:          VALID_PACE.includes(input.pace)    ? input.pace   : 'balanced',
      budget:        VALID_BUDGET.includes(input.budget) ? input.budget : 'mid-range',
      stayLocation:  typeof input.stayLocation === 'string' ? sanitisePromptField(input.stayLocation, 120) : '',
      dietaryNeeds:  Array.isArray(input.dietaryNeeds) ? input.dietaryNeeds.filter(d => VALID_DIETARY.includes(d)) : [],
      cuisinePrefs:  Array.isArray(input.cuisinePrefs)  ? input.cuisinePrefs.filter(c => VALID_CUISINE.includes(c))  : [],
    };

    // ── Call Gemini, with model fallback chain ──────────────────────────────
    // gemini-2.5-flash is popular and gets saturated under load ("high demand"
    // 503s), and retrying the SAME overloaded model often just fails again and
    // again. So: try 2.5-flash twice, then fall back to 2.0-flash, then
    // 1.5-flash — different models/quotas, much more likely one is free.
    const MODEL_CHAIN = [
      'gemini-2.5-flash',       // best quality — try twice with backoff
      'gemini-2.5-flash',
      'gemini-2.0-flash-lite',  // lighter/cheaper, better free-tier availability
      'gemini-2.0-flash',       // requires billing but worth a try
    ];

    try {
      const genAI = getGeminiClient();
      const prompt = buildPrompt(sanitised);

      const makeModel = (modelName) => genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ITINERARY_SCHEMA,
          temperature: 0.85,       // Creative but grounded
          topP: 0.92,
          maxOutputTokens: 16384,  // 8192 was too small for detailed multi-day itineraries — was truncating JSON mid-response
        },
        systemInstruction: 'You are a warm, knowledgeable family travel expert. You write like a trusted friend who knows every destination personally — specific, practical, and genuinely useful. Never generic. Always consider the exact group composition.',
      });

      let result;
      let lastErr;
      for (let i = 0; i < MODEL_CHAIN.length; i++) {
        const modelName = MODEL_CHAIN[i];
        try {
          result = await makeModel(modelName).generateContent(prompt);
          lastErr = null;
          if (i > 0) console.log(`Succeeded with fallback model "${modelName}" (attempt ${i + 1})`);
          break;
        } catch (e) {
          lastErr = e;
          // Treat overload (503) AND quota/rate-limit (429) as reasons to try
          // the next model — different models draw from different quota pools,
          // so a 429 on one doesn't mean the next will also fail.
          const retryWorthy = e?.status === 503 || e?.status === 429
            || /high demand|overloaded|503|429|quota|rate.?limit/i.test(e?.message || '');
          if (!retryWorthy || i === MODEL_CHAIN.length - 1) throw e;
          console.warn(`"${modelName}" overloaded (attempt ${i + 1}/${MODEL_CHAIN.length}), trying next option...`, e.message);
          // Wait longer before trying next model — gives overloaded endpoints
          // time to recover and avoids hammering the free-tier rate limiter.
          await new Promise((res) => setTimeout(res, i < 2 ? 3000 : 1000));
        }
      }
      const text = result.response.text();

      // Parse and validate
      let itinerary;
      try {
        itinerary = JSON.parse(text);
      } catch (parseErr) {
        console.error('Gemini returned invalid JSON:', text.slice(0, 500));
        throw new HttpsError('internal', 'AI returned malformed response. Please try again.');
      }

      // Basic sanity check
      if (!itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
        throw new HttpsError('internal', 'AI response missing itinerary days. Please try again.');
      }

      return {
        success: true,
        itinerary: {
          ...itinerary,
          destination: sanitised.destination,
          generatedAt: new Date().toISOString(),
        },
      };

    } catch (err) {
      // Re-throw HttpsErrors as-is
      if (err instanceof HttpsError) throw err;

      // Handle Gemini rate limit (free tier)
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        throw new HttpsError(
          'resource-exhausted',
          'Our AI is taking a quick break. Please try again in a moment.',
        );
      }

      console.error('Gemini error:', err);
      throw new HttpsError('internal', 'Failed to generate itinerary. Please try again.');
    }
  },
);

// ─── Health check function (for testing deployment) ───────────────────────────
exports.health = onCall({ region: 'us-central1' }, async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
