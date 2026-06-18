// ─── Unsplash integration for destination hero images ────────────────────────
// Set your Access Key from unsplash.com/developers (free, 50 req/hr on demo key)
// After Firebase setup, add this to your .env or constants:
//   UNSPLASH_ACCESS_KEY = 'your_access_key_here'
//
// For now: set the key below and images will load automatically.
// Leave blank → itinerary shows the Golden Hour gradient as hero (still beautiful).

const UNSPLASH_ACCESS_KEY = ''; // ← paste your Unsplash access key here

const BASE_URL = 'https://api.unsplash.com';

// Cache so the same query doesn't hit the API twice in a session
const imageCache: Record<string, string> = {};

// ─── Fetch a destination photo URL ───────────────────────────────────────────
export async function fetchDestinationImage(query: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;
  if (!query?.trim()) return null;

  const cacheKey = query.toLowerCase().trim();
  if (imageCache[cacheKey]) return imageCache[cacheKey];

  try {
    const url = `${BASE_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&content_filter=high`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Pick a random one from the top 3 for variety
    const results: any[] = data?.results ?? [];
    if (results.length === 0) return null;

    const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))];
    const imageUrl: string = pick?.urls?.regular ?? null;

    if (imageUrl) {
      imageCache[cacheKey] = imageUrl;
    }
    return imageUrl ?? null;
  } catch {
    return null;
  }
}
