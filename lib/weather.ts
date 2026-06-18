import { WeatherDay } from '../types';

// Open-Meteo — completely free, no API key required
// Docs: https://open-meteo.com/en/docs

// ─── WMO weather code → human label + emoji ───────────────────────────────────
const WMO_META: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Clear sky',        icon: '☀️'  },
  1:  { label: 'Mainly clear',     icon: '🌤️'  },
  2:  { label: 'Partly cloudy',    icon: '⛅'  },
  3:  { label: 'Overcast',         icon: '☁️'  },
  45: { label: 'Foggy',            icon: '🌫️'  },
  48: { label: 'Icy fog',          icon: '🌫️'  },
  51: { label: 'Light drizzle',    icon: '🌦️'  },
  53: { label: 'Drizzle',          icon: '🌦️'  },
  55: { label: 'Heavy drizzle',    icon: '🌧️'  },
  61: { label: 'Light rain',       icon: '🌧️'  },
  63: { label: 'Rain',             icon: '🌧️'  },
  65: { label: 'Heavy rain',       icon: '🌧️'  },
  71: { label: 'Light snow',       icon: '🌨️'  },
  73: { label: 'Snow',             icon: '❄️'  },
  75: { label: 'Heavy snow',       icon: '❄️'  },
  80: { label: 'Showers',          icon: '🌦️'  },
  81: { label: 'Showers',          icon: '🌧️'  },
  82: { label: 'Heavy showers',    icon: '⛈️'  },
  95: { label: 'Thunderstorm',     icon: '⛈️'  },
  96: { label: 'Thunderstorm',     icon: '⛈️'  },
  99: { label: 'Severe storm',     icon: '🌩️'  },
};

function wmoMeta(code: number) {
  return WMO_META[code] ?? { label: 'Variable', icon: '🌤️' };
}

// ─── Step 1: geocode destination name → lat/lon ───────────────────────────────
async function geocode(destination: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lon: r.longitude };
  } catch {
    return null;
  }
}

// ─── Step 2: fetch daily forecast for date range ──────────────────────────────
export async function fetchWeather(
  destination: string,
  startDate: Date,
  endDate: Date,
): Promise<WeatherDay[]> {
  try {
    const coords = await geocode(destination);
    if (!coords) return [];

    const start = startDate.toISOString().slice(0, 10);
    const end   = endDate.toISOString().slice(0, 10);
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${coords.lat}&longitude=${coords.lon}`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&timezone=auto&start_date=${start}&end_date=${end}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const dates: string[]  = data?.daily?.time                        ?? [];
    const codes: number[]  = data?.daily?.weathercode                 ?? [];
    const maxTs: number[]  = data?.daily?.temperature_2m_max          ?? [];
    const minTs: number[]  = data?.daily?.temperature_2m_min          ?? [];
    const rains: number[]  = data?.daily?.precipitation_probability_max ?? [];

    return dates.map((date, i) => {
      const code = codes[i] ?? 0;
      const meta = wmoMeta(code);
      return {
        date,
        tempMax:     Math.round(maxTs[i] ?? 0),
        tempMin:     Math.round(minTs[i] ?? 0),
        rainChance:  rains[i] ?? 0,
        description: meta.label,
        icon:        meta.icon,
        _wmoCode:    code,
      };
    });
  } catch {
    return [];
  }
}

// ─── Weather alert types ──────────────────────────────────────────────────────
export type WeatherAlert = 'rain' | 'heat' | 'cold' | 'snow' | 'storm' | null;

export function getWeatherAlert(day: WeatherDay): WeatherAlert {
  const code = day._wmoCode ?? 0;
  if (code >= 95)                  return 'storm';   // thunderstorm
  if (code >= 71 && code <= 77)    return 'snow';    // snow
  if (day.rainChance >= 60)        return 'rain';
  if (day.tempMax >= 35)           return 'heat';    // heat wave
  if (day.tempMax <= 2)            return 'cold';    // freezing
  return null;
}

export function isBadWeather(day: WeatherDay): boolean {
  return getWeatherAlert(day) !== null;
}
