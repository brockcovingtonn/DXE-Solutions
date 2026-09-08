'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

const STEPS = [
  {
    icon: 'ti-home-2',
    title: 'Welcome to your DXE Solutions portal',
    body: "This is where you'll track your project from start to finish — status, documents, photos, and updates from Dixie, all in one place. Here's a quick look around.",
  },
  {
    icon: 'ti-layout-dashboard',
    title: 'My Projects',
    body: "If you have more than one project with DXE, they'll all be listed here in the sidebar — click any one to switch between them.",
  },
  {
    icon: 'ti-list-details',
    title: 'Your project, section by section',
    body: "Once you pick a project, its own sidebar section appears — Overview, Calendar, Permits, Utilities, Accounting, Documents, Photos, and Notes & Updates — everything Dixie is tracking for that job.",
  },
  {
    icon: 'ti-message-circle',
    title: 'Chat & the Assistant',
    body: "The two floating icons in the bottom-right corner are always there: the message bubble opens a direct chat with DXE, and the sparkle icon opens an AI assistant that can answer questions about your project any time.",
  },
  {
    icon: 'ti-settings',
    title: 'Account Settings',
    body: "Update your contact info, change your password, or turn project-update emails on or off — all from Account Settings at the bottom of the sidebar.",
  },
];

export default function OnboardingTour({ userId, initialSeen }) {
  const supabase = createClient();
  const [open, setOpen] = useState(!initialSeen);
  const [step, setStep] = useState(0);

  async function finish() {
    setOpen(false);
    await supabase.from('profiles').update({ has_seen_portal_tour: true }).eq('id', userId);
  }

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,28,38,0.55)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ background: 'var(--white)', width: '420px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ padding: '2.25rem 2rem 1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--navy)',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              margin: '0 auto 1.25rem',
            }}
          >
            <i className={`ti ${current.icon}`} aria-hidden="true"></i>
          </div>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 500, color: 'var(--navy)', marginBottom: '0.75rem' }}>
            {current.title}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{current.body}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', paddingBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: i === step ? 'var(--gold)' : 'rgba(var(--border-rgb),0.2)',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(var(--border-rgb),0.1)',
          }}
        >
          <button type="button" onClick={finish} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.8rem', cursor: 'pointer' }}>
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(var(--border-rgb),0.25)',
                  color: 'var(--navy)',
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button type="button" className="btn-navy" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
