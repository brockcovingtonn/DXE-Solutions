'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  projectType: '',
  projectValue: '',
  location: '',
  serviceNeeded: '',
  details: '',
};

export default function EstimatePage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Request failed');

      setStatus('success');
      setForm(initialForm);
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <section className={`section ${styles.estimateSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">Get Started</div>
              <h2 className="display" style={{ color: 'var(--white)' }}>
                Tell us about your project.
              </h2>
            </div>

            {status === 'success' ? (
              <div className={styles.successBox}>
                <i className="ti ti-circle-check" aria-hidden="true"></i>
                <h3 className="display">Request received.</h3>
                <p>
                  Thanks for reaching out. Dixie reviews every submission personally and will
                  reply directly to your email, usually within 1–2 business days.
                </p>
              </div>
            ) : (
              <form className={styles.estimateForm} onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Dixie"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Smith"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(818) 555-0000"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="projectType">Project Type</label>
                    <select
                      id="projectType"
                      name="projectType"
                      value={form.projectType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select type...</option>
                      <option>Residential — New Construction</option>
                      <option>Residential — Renovation / Addition</option>
                      <option>Commercial — New Construction</option>
                      <option>Commercial — Tenant Improvement</option>
                      <option>Mixed-Use Development</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectValue">Estimated Project Value</label>
                    <select
                      id="projectValue"
                      name="projectValue"
                      value={form.projectValue}
                      onChange={handleChange}
                    >
                      <option value="">Select range...</option>
                      <option>Under $500K</option>
                      <option>$500K – $1M</option>
                      <option>$1M – $3M</option>
                      <option>$3M – $10M</option>
                      <option>$10M+</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Project Location</label>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="City, State"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="serviceNeeded">Services Needed</label>
                  <select
                    id="serviceNeeded"
                    name="serviceNeeded"
                    value={form.serviceNeeded}
                    onChange={handleChange}
                  >
                    <option value="">Select primary service...</option>
                    <option>Full Project Management</option>
                    <option>Permitting &amp; Entitlements Only</option>
                    <option>Inspections &amp; Compliance</option>
                    <option>Schedule / Budget Management</option>
                    <option>Project Close-Out</option>
                    <option>Not Sure — Need Consultation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="details">Tell us about your project</label>
                  <textarea
                    id="details"
                    name="details"
                    placeholder="Describe your project, timeline goals, and any challenges you're currently facing..."
                    value={form.details}
                    onChange={handleChange}
                  />
                </div>

                {status === 'error' && (
                  <p className={styles.errorMsg}>
                    Something went wrong sending your request. Please try again, or email Dixie
                    directly at dixie@dxesolutions.com.
                  </p>
                )}

                <button type="submit" className="btn-primary" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending...' : 'Submit Estimate Request'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
