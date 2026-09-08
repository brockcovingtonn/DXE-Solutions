'use client';

import { useState, useMemo, useEffect } from 'react';
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
function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
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
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function eventsOnDay(events, day) {
  return events
    .filter((e) => {
      const start = startOfDay(new Date(e.start_time));
      const end = e.end_time ? startOfDay(new Date(e.end_time)) : start;
      return start <= day && day <= end;
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

const navBtnStyle = {
  background: 'none',
  border: '1px solid rgba(var(--border-rgb),0.15)',
  padding: '0.4rem 0.7rem',
  fontSize: '0.8rem',
  color: 'var(--navy)',
  cursor: 'pointer',
};

const tabBtnStyle = {
  background: 'none',
  border: '1px solid rgba(var(--border-rgb),0.15)',
  padding: '0.4rem 0.8rem',
  fontSize: '0.78rem',
  color: 'var(--navy)',
  cursor: 'pointer',
};

const activeTabStyle = { background: 'var(--navy)', color: 'var(--white)', borderColor: 'var(--navy)' };

export default function CalendarView({ events, onSelectEvent, selectedEventId, headerActions }) {
  const [view, setView] = useState('month');
  const [refDate, setRefDate] = useState(() => startOfDay(new Date()));
  const [weatherDays, setWeatherDays] = useState([]);

  useEffect(() => {
    fetchWeather().then((data) => setWeatherDays(data.days || []));
  }, []);

  function goToday() {
    setRefDate(startOfDay(new Date()));
  }
  function goPrev() {
    if (view === 'month') setRefDate((d) => addMonths(d, -1));
    else if (view === 'week') setRefDate((d) => addDays(d, -7));
    else setRefDate((d) => addDays(d, -1));
  }
  function goNext() {
    if (view === 'month') setRefDate((d) => addMonths(d, 1));
    else if (view === 'week') setRefDate((d) => addDays(d, 7));
    else setRefDate((d) => addDays(d, 1));
  }

  const title = useMemo(() => {
    if (view === 'day') {
      return refDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'week') {
      const start = startOfWeek(refDate);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [view, refDate]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={goPrev} style={navBtnStyle} aria-label="Previous">
            <i className="ti ti-chevron-left" aria-hidden="true"></i>
          </button>
          <button type="button" onClick={goToday} style={navBtnStyle}>
            Today
          </button>
          <button type="button" onClick={goNext} style={navBtnStyle} aria-label="Next">
            <i className="ti ti-chevron-right" aria-hidden="true"></i>
          </button>
          <h3 style={{ marginLeft: '0.5rem', fontSize: '1.05rem', fontWeight: 500 }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{ ...tabBtnStyle, ...(view === v ? activeTabStyle : {}) }}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
          {headerActions}
        </div>
      </div>

      {view === 'month' && (
        <MonthGrid refDate={refDate} events={events} onSelectEvent={onSelectEvent} selectedEventId={selectedEventId} weatherDays={weatherDays} />
      )}
      {view === 'week' && (
        <WeekGrid refDate={refDate} events={events} onSelectEvent={onSelectEvent} selectedEventId={selectedEventId} weatherDays={weatherDays} />
      )}
      {view === 'day' && (
        <DayBrief refDate={refDate} events={events} onSelectEvent={onSelectEvent} selectedEventId={selectedEventId} weatherDays={weatherDays} />
      )}
    </div>
  );
}

function MonthGrid({ refDate, events, onSelectEvent, selectedEventId, weatherDays }) {
  const monthStart = startOfMonth(refDate);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = startOfDay(new Date());

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
      {WEEKDAY_LABELS.map((d) => (
        <div
          key={d}
          style={{
            background: 'var(--surface)',
            padding: '0.5rem',
            fontSize: '0.65rem',
            textAlign: 'center',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {d}
        </div>
      ))}
      {days.map((day, i) => {
        const inMonth = day.getMonth() === monthStart.getMonth();
        const dayEvents = eventsOnDay(events, day);
        const isToday = isSameDay(day, today);
        const weather = weatherForDate(weatherDays, day);
        return (
          <div key={i} style={{ background: 'var(--white)', minHeight: '92px', padding: '0.4rem', opacity: inMonth ? 1 : 0.4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--gold)' : 'var(--navy)' }}>
                {day.getDate()}
              </div>
              {weather && (
                <div title={`${weatherDisplay(weather.weatherCode).label} · High ${weather.high}° / Low ${weather.low}°`} style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                  {weatherDisplay(weather.weatherCode).emoji} {weather.high}°
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {dayEvents.slice(0, 3).map((e) => (
                <EventChip key={e.id} event={e} selected={e.id === selectedEventId} onClick={() => onSelectEvent(e)} />
              ))}
              {dayEvents.length > 3 && <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>+{dayEvents.length - 3} more</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({ refDate, events, onSelectEvent, selectedEventId, weatherDays }) {
  const start = startOfWeek(refDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = startOfDay(new Date());

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
      {days.map((day, i) => {
        const dayEvents = eventsOnDay(events, day);
        const isToday = isSameDay(day, today);
        const weather = weatherForDate(weatherDays, day);
        return (
          <div key={i} style={{ border: '1px solid var(--border)', minHeight: '170px' }}>
            <div style={{ padding: '0.5rem', background: isToday ? 'var(--surface)' : 'transparent', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{WEEKDAY_LABELS[day.getDay()]}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--gold)' : 'var(--navy)' }}>{day.getDate()}</div>
              {weather && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                  {weatherDisplay(weather.weatherCode).emoji} {weather.high}°/{weather.low}°
                </div>
              )}
            </div>
            <div style={{ padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {dayEvents.map((e) => (
                <EventChip key={e.id} event={e} selected={e.id === selectedEventId} onClick={() => onSelectEvent(e)} showTime />
              ))}
              {dayEvents.length === 0 && <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayBrief({ refDate, events, onSelectEvent, selectedEventId, weatherDays }) {
  const dayEvents = eventsOnDay(events, refDate);
  const weather = weatherForDate(weatherDays, refDate);

  return (
    <div>
      {weather && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--navy)', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '1.3rem' }}>{weatherDisplay(weather.weatherCode).emoji}</span>
          <span>
            {weatherDisplay(weather.weatherCode).label} · High {weather.high}° / Low {weather.low}°
            {weather.precipitationChance != null && weather.precipitationChance > 0 ? ` · ${weather.precipitationChance}% chance of rain` : ''}
          </span>
        </div>
      )}
      {dayEvents.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nothing on the calendar for this day.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {dayEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEvent(e)}
              style={{
                textAlign: 'left',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '0.85rem',
                border: '1px solid rgba(var(--border-rgb),0.12)',
                cursor: 'pointer',
                background: e.id === selectedEventId ? 'var(--surface)' : 'var(--white)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 600, flexShrink: 0, width: '5rem' }}>
                {e.all_day ? 'All day' : formatTime(e.start_time)}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--navy)' }}>{e.title}</div>
                {e.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{e.description}</div>}
                {e.projects?.name && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                    {e.projects.name}
                    {e.visible_to_client ? ' · Visible to client' : ''}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventChip({ event, selected, onClick, showTime }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: '0.68rem',
        textAlign: 'left',
        padding: '0.2rem 0.4rem',
        border: 'none',
        cursor: 'pointer',
        background: selected ? 'var(--navy)' : event.visible_to_client ? 'rgba(201,168,87,0.2)' : 'var(--surface)',
        color: selected ? 'var(--white)' : 'var(--navy)',
        whiteSpace: showTime ? 'normal' : 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {showTime && !event.all_day && <div style={{ fontSize: '0.6rem', opacity: 0.75 }}>{formatTime(event.start_time)}</div>}
      {event.title}
    </button>
  );
}
