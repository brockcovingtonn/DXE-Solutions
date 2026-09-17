'use client';

import { useEffect, useState } from 'react';

const DEFAULT_TZ = 'America/Los_Angeles';

function dateStringInTz(date, timeZone) {
  // en-CA gives YYYY-MM-DD directly, no reformatting needed.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Shown after a successful "Book a 15-min call" submission when Google
// booking is enabled — a real open-slot picker checked live against the
// connected Google Calendar (see app/api/booking-availability,
// app/api/book-call). estimateRequestId ties the booking back to the lead
// just created by the form.
export default function BookingSlotPicker({ estimateRequestId }) {
  const [dayOffset, setDayOffset] = useState(0);
  const [timezone, setTimezone] = useState(DEFAULT_TZ);
  const [maxDaysOut, setMaxDaysOut] = useState(14);
  const [slots, setSlots] = useState([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  const dateStr = dateStringInTz(new Date(Date.now() + dayOffset * 86_400_000), timezone);
  const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(Date.now() + dayOffset * 86_400_000)
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/booking-availability?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.error) {
          setError(data.error);
          setSlots([]);
          return;
        }
        setSlots(data.slots || []);
        setConnected(data.connected !== false);
        setTimezone(data.timezone || DEFAULT_TZ);
        setMaxDaysOut(data.maxDaysOut || 14);
      })
      .catch(() => active && setError('Could not load available times.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  async function book(startTime) {
    setBooking(startTime);
    setError('');
    try {
      const res = await fetch('/api/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateRequestId, startTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not book that time.');
      setBooked(startTime);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(null);
    }
  }

  if (!connected) return null;

  if (booked) {
    const tzLabel = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(new Date(booked))
      .find((p) => p.type === 'timeZoneName')?.value;
    const when = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(booked));
    return (
      <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid rgba(201,168,87,0.4)', borderRadius: 8 }}>
        <strong>Booked — {when} {tzLabel}</strong>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>We've sent a confirmation to your email.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pick a time for your call</p>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-outline" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }} onClick={() => setDayOffset((d) => Math.max(0, d - 1))} disabled={dayOffset === 0}>
          ←
        </button>
        <span style={{ fontSize: '0.85rem', alignSelf: 'center', minWidth: 120, textAlign: 'center' }}>{dayLabel}</span>
        <button type="button" className="btn-outline" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }} onClick={() => setDayOffset((d) => Math.min(maxDaysOut - 1, d + 1))} disabled={dayOffset >= maxDaysOut - 1}>
          →
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Loading times…</p>
      ) : slots.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>No open times this day — try another.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              className="btn-outline"
              style={{ padding: '0.5rem', fontSize: '0.8rem' }}
              onClick={() => book(slot)}
              disabled={booking !== null}
            >
              {booking === slot ? '…' : new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }).format(new Date(slot))}
            </button>
          ))}
        </div>
      )}

      {error ? <p style={{ fontSize: '0.8rem', color: '#b45252', marginTop: '0.6rem' }}>{error}</p> : null}
    </div>
  );
}
