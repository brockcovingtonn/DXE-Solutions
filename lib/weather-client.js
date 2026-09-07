// Shared by every calendar-ish component so a page with several of
// them (e.g. a dashboard's week strip + a full month view) only hits
// /api/weather once per short window.
let cachedPromise = null;
let cachedAt = 0;

export function fetchWeather() {
  const now = Date.now();
  if (cachedPromise && now - cachedAt < 10 * 60 * 1000) return cachedPromise;
  cachedAt = now;
  cachedPromise = fetch('/api/weather')
    .then((res) => (res.ok ? res.json() : { days: [] }))
    .catch(() => ({ days: [] }));
  return cachedPromise;
}

// WMO weather codes, per Open-Meteo's daily `weathercode` field.
const CODE_MAP = {
  0: { emoji: '☀️', label: 'Clear' },
  1: { emoji: '🌤️', label: 'Mostly Clear' },
  2: { emoji: '⛅', label: 'Partly Cloudy' },
  3: { emoji: '☁️', label: 'Overcast' },
  45: { emoji: '🌫️', label: 'Fog' },
  48: { emoji: '🌫️', label: 'Fog' },
  51: { emoji: '🌦️', label: 'Drizzle' },
  53: { emoji: '🌦️', label: 'Drizzle' },
  55: { emoji: '🌦️', label: 'Drizzle' },
  56: { emoji: '🌦️', label: 'Freezing Drizzle' },
  57: { emoji: '🌦️', label: 'Freezing Drizzle' },
  61: { emoji: '🌧️', label: 'Rain' },
  63: { emoji: '🌧️', label: 'Rain' },
  65: { emoji: '🌧️', label: 'Heavy Rain' },
  66: { emoji: '🌧️', label: 'Freezing Rain' },
  67: { emoji: '🌧️', label: 'Freezing Rain' },
  71: { emoji: '🌨️', label: 'Snow' },
  73: { emoji: '🌨️', label: 'Snow' },
  75: { emoji: '🌨️', label: 'Heavy Snow' },
  77: { emoji: '🌨️', label: 'Snow Grains' },
  80: { emoji: '🌦️', label: 'Showers' },
  81: { emoji: '🌦️', label: 'Showers' },
  82: { emoji: '🌦️', label: 'Heavy Showers' },
  85: { emoji: '🌨️', label: 'Snow Showers' },
  86: { emoji: '🌨️', label: 'Snow Showers' },
  95: { emoji: '⛈️', label: 'Thunderstorm' },
  96: { emoji: '⛈️', label: 'Thunderstorm' },
  99: { emoji: '⛈️', label: 'Thunderstorm' },
};

export function weatherDisplay(code) {
  return CODE_MAP[code] || { emoji: '🌡️', label: 'Unknown' };
}

export function weatherForDate(days, date) {
  if (!days || days.length === 0) return null;
  const key = toDateKey(date);
  return days.find((d) => d.date === key) || null;
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
