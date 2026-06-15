'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
      return;
    }

    // Check if this account is an admin and route accordingly
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .single();

    if (profile?.is_admin) {
      router.push('/admin/clients');
    } else {
      router.push('/portal');
    }
    router.refresh();
  }

  return (
    <div className={styles.loginPage}>
      <Link href="/" className={styles.backLink}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to site
      </Link>
      <div className={styles.loginWrap}>
        <div className={styles.loginLeft}>
          <div className={styles.loginLogo}>
            <Image
              src="/images/logo-gold.png"
              alt="DXE Solutions"
              fill
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
              priority
            />
          </div>
          <div className={styles.eyebrow}>Client Portal</div>
          <h2 className="display">
            Your project,
            <br />
            always in view.
          </h2>
          <p>
            Log in to your DXE Solutions client portal to track progress, access documents, and
            stay connected to your project in real time.
          </p>
          <ul className={styles.features}>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>Live project status &amp;
              milestone tracking
            </li>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>All project documents in
              one place
            </li>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>Progress photos updated by
              your PM
            </li>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>Notes and updates from
              Dixie
            </li>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>Upload your own files
              securely
            </li>
            <li>
              <i className="ti ti-circle-check" aria-hidden="true"></i>Manage multiple projects in
              one account
            </li>
          </ul>
        </div>
        <div className={styles.loginRight}>
          <h3 className="display">Sign in to your account</h3>
          <p>Enter your credentials to access the client portal.</p>

          {error && <div className={styles.errorBox}>{error}</div>}

          <form onSubmit={handleLogin}>
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
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
