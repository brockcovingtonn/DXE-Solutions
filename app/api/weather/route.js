import { NextResponse } from 'next/server';

// Free, keyless forecast API (Open-Meteo) — no auth needed here, this
// isn't user data. Defaults to Los Angeles, CA (DXE's primary service
// area per the marketing pages); override with WEATHER_LATITUDE /
// WEATHER_LONGITUDE env vars if the firm's actual base is different.
const LATITUDE = process.env.WEATHER_LATITUDE || '34.0522';
const LONGITUDE = process.env.WEATHER_LONGITUDE || '-118.2437';

// Route handlers with no dynamic APIs (cookies/headers/searchParams)
// get statically rendered ONCE at build time by default — without
// this, the forecast would freeze forever at whatever it was during
// `next build`. Revalidating every 30 min via Next's own data cache
// (not a hand-rolled in-memory one, which isn't reliable across
// separate serverless invocations) keeps it fresh without hammering
// Open-Meteo on every request.
export const revalidate = 1800;

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
    const data = await res.json();

    const times = data.daily?.time || [];
    const days = times.map((date, i) => ({
      date,
      weatherCode: data.daily.weathercode[i],
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      precipitationChance: data.daily.precipitation_probability_max[i],
    }));

    return NextResponse.json({ days });
  } catch (err) {
    console.error('Weather fetch error:', err);
    return NextResponse.json({ days: [] });
  }
}
