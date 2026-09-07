'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddToCalendarLink from '@/components/AddToCalendarLink';
import { fetchWeather, weatherDisplay, weatherForDate } from '@/lib/weather-client';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function eventsOnDay(events, day) {
  return (events || [])
    .filter((e) => {
      const start = startOfDay(new Date(e.start_time));
      const end = e.end_time ? startOfDay(new Date(e.end_time)) : start;
      return start <= day && day <= end;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

export default function WeekStripCalendar({ events, viewAllHref }) {
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(today);
  const [weatherDays, setWeatherDays] = useState([]);

  useEffect(() => {
    fetchWeather().then((data) => setWeatherDays(data.days || []));
  }, []);

  const weekStart = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedEvents = eventsOnDay(events, selected);
  const isToday = isSameDay(selected, today);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {days.map((day, i) => {
          const count = eventsOnDay(events, day).length;
          const isSelected = isSameDay(day, selected);
          const isTodayCol = isSameDay(day, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(day)}
              style={{
                textAlign: 'center',
                padding: '0.6rem 0.3rem',
                border: '1px solid rgba(62,84,104,0.12)',
                background: isSelected ? 'var(--navy)' : isTodayCol ? 'var(--surface)' : 'var(--white)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: '0.62rem',
                  color: isSelected ? 'rgba(255,255,255,0.7)' : '#a0aec0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {WEEKDAY_LABELS[day.getDay()]}
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: isTodayCol ? 700 : 500,
                  color: isSelected ? 'var(--white)' : isTodayCol ? 'var(--gold)' : 'var(--navy)',
                  margin: '0.15rem 0',
                }}
              >
                {day.getDate()}
              </div>
              <div
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  margin: '0 auto',
                  background: count > 0 ? (isSelected ? 'var(--gold-light)' : 'var(--gold)') : 'transparent',
                }}
              />
              {(() => {
                const weather = weatherForDate(weatherDays, day);
                return weather ? (
                  <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#a0aec0' }}>
                    {weatherDisplay(weather.weatherCode).emoji} {weather.high}°
                  </div>
                ) : null;
              })()}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy)', marginBottom: '0.75rem' }}>
        {isToday ? 'Today' : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      {selectedEvents.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: '#a0aec0', marginBottom: '1rem' }}>Nothing scheduled.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {selectedEvents.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600, flexShrink: 0, width: '4.2rem' }}>
                {e.all_day ? 'All day' : formatTime(e.start_time)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--navy)' }}>{e.title}</div>
                {e.projects?.name && <div style={{ fontSize: '0.72rem', color: '#a0aec0' }}>{e.projects.name}</div>}
              </div>
              <AddToCalendarLink event={e} iconOnly />
            </div>
          ))}
        </div>
      )}

      {viewAllHref && (
        <Link href={viewAllHref} style={{ fontSize: '0.78rem', color: 'var(--navy)', fontWeight: 500 }}>
          View full calendar →
        </Link>
      )}
    </div>
  );
}
