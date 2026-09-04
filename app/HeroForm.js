'use client';

import { useState } from 'react';
import { PROJECT_TYPES } from '@/lib/constants';
import styles from './page.module.css';

const initialForm = { name: '', contact: '', projectType: '', details: '' };

export default function HeroForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const contact = form.contact.trim();
    const isEmail = contact.includes('@');
    const [firstName, ...rest] = form.name.trim().split(/\s+/);

    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || form.name.trim(),
          lastName: rest.join(' '),
          email: isEmail ? contact : '',
          phone: isEmail ? '' : contact,
          projectType: form.projectType,
          details: form.details,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      setStatus('success');
      setForm(initialForm);
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
              <label htmlFor="contact">Phone or email</label>
              <input
                id="contact"
                name="contact"
                type="text"
                placeholder="Best way to reach you"
                value={form.contact}
                onChange={handleChange}
                required
              />
            </div>
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
