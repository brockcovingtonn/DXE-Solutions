'use client';

import { useState } from 'react';
import { PROJECT_TYPES } from '@/lib/constants';
import BookingSlotPicker from '@/components/BookingSlotPicker';
import styles from './page.module.css';

const initialForm = { name: '', phone: '', email: '', projectType: '', details: '', hearAbout: '', referralName: '' };

const HEAR_ABOUT_OPTIONS = [
  'Google or web search',
  'Referral',
  'Social media',
  'Saw one of our project signs',
  'Worked with DXE before',
  'Other',
];

export default function HeroForm({ googleBookingEnabled = true }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [estimateRequestId, setEstimateRequestId] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.phone.trim() && !form.email.trim()) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');

    const [firstName, ...rest] = form.name.trim().split(/\s+/);

    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || form.name.trim(),
          lastName: rest.join(' '),
          email: form.email.trim(),
          phone: form.phone.trim(),
          projectType: form.projectType,
          details: form.details,
          hearAbout: form.hearAbout,
          referralName: form.hearAbout === 'Referral' ? form.referralName.trim() : '',
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error('Request failed');

      setStatus('success');
      setForm(initialForm);
      setEstimateRequestId(data.estimateRequestId || null);
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <div className={styles.heroFormCard} id="call">
      {status === 'success' ? (
        <div className={styles.formSuccess}>
          <i className="ti ti-circle-check" aria-hidden="true"></i>
          <h3 className="display">Request received.</h3>
          <p>
            Dixie reviews every submission personally and will follow up with your next
            three steps, usually within 1–2 business days.
          </p>
          {googleBookingEnabled && estimateRequestId ? <BookingSlotPicker estimateRequestId={estimateRequestId} /> : null}
        </div>
      ) : (
        <>
          <h3 className="display">Book a 15-min call</h3>
          <p className={styles.heroFormSub}>
            Tell us where it&apos;s stuck. We come back with the next three steps, whether
            you hire us or not.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(555) 555-5555"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="hearAbout">How did you hear about us?</label>
              <select
                id="hearAbout"
                name="hearAbout"
                value={form.hearAbout}
                onChange={handleChange}
              >
                <option value="">Select one...</option>
                {HEAR_ABOUT_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            {form.hearAbout === 'Referral' && (
              <div className="form-group">
                <label htmlFor="referralName">Who referred you?</label>
                <input
                  id="referralName"
                  name="referralName"
                  type="text"
                  placeholder="Their name"
                  value={form.referralName}
                  onChange={handleChange}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="projectType">Project type</label>
              <select
                id="projectType"
                name="projectType"
                value={form.projectType}
                onChange={handleChange}
                required
              >
                <option value="">Select type...</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="details">Where it stands</label>
              <textarea
                id="details"
                name="details"
                placeholder="City, current stage, what's holding it up"
                value={form.details}
                onChange={handleChange}
              />
            </div>

            {status === 'invalid' && (
              <p className={styles.formError}>Please provide a phone number or an email address.</p>
            )}
            {status === 'error' && (
              <p className={styles.formError}>
                Something went wrong. Please try again, or email Dixie directly.
              </p>
            )}

            <button type="submit" className="btn-gold" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending...' : 'Request my call'}
            </button>
          </form>
          <p className={styles.heroFormFoot}>
            Or email{' '}
            <a href="mailto:dixie@dxesolutions.com" className={styles.heroFormLink}>
              dixie@dxesolutions.com
            </a>{' '}
            directly.
          </p>
        </>
      )}
    </div>
  );
}
