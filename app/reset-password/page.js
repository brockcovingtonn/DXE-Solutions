'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import styles from '../login/page.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('Could not reset your password. Please request a new link and try again.');
      return;
    }

    setDone(true);
    setTimeout(() => router.push('/login'), 2000);
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
            Set a new
            <br />
            password.
          </h2>
          <p>Choose a new password for your DXE Solutions account.</p>
        </div>
        <div className={styles.loginRight}>
          {done ? (
            <>
              <h3 className="display">Password updated</h3>
              <p>Redirecting you to login...</p>
            </>
          ) : !ready ? (
            <>
              <h3 className="display">Verifying link</h3>
              <p>
                If this takes more than a few seconds, your reset link may be invalid or expired.{' '}
                <Link href="/forgot-password">Request a new one</Link>.
              </p>
            </>
          ) : (
            <>
              <h3 className="display">New password</h3>
              <p>Must be at least 8 characters.</p>

              {error && <div className={styles.errorBox}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="password">New Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-gold" disabled={loading}>
                  {loading ? 'Saving...' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
