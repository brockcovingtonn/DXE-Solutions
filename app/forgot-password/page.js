'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import styles from '../login/page.module.css';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('email');
    if (prefill) setEmail(prefill);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setSent(true);
  }

  return (
    <div className={styles.loginPage}>
      <Link href="/login" className={styles.backLink}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to login
      </Link>
      <div className={styles.loginWrap}>
        <div className={styles.loginLeft}>
          <div className={styles.loginLogo}>
            <Image
              src="/images/logo-slate.png"
              alt="DXE Solutions"
              fill
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
              priority
            />
          </div>
          <div className={styles.eyebrow}>Account Recovery</div>
          <h2 className="display">
            Forgot your
            <br />
            password?
          </h2>
          <p>
            Enter the email address on your account and we&apos;ll send you a link to reset your
            password.
          </p>
        </div>
        <div className={styles.loginRight}>
          {sent ? (
            <>
              <h3 className="display">Check your email</h3>
              <p>
                If an account exists for <strong>{email}</strong>, a password reset link is on its
                way. It may take a few minutes to arrive.
              </p>
            </>
          ) : (
            <>
              <h3 className="display">Reset your password</h3>
              <p>Enter your email address to receive a reset link.</p>

              {error && <div className={styles.errorBox}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-gold" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
