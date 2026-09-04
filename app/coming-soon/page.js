import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata = {
  title: 'DXE Solutions | Coming Soon',
  description:
    'DXE Solutions — Permitting & Project Management. Our new website is on the way.',
};

export default function ComingSoonPage() {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(201,168,87,1)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className={styles.accent} aria-hidden="true"></div>
      <div className={styles.accent2} aria-hidden="true"></div>

      <div className={styles.content}>
        <div className={styles.logo}>
          <Image
            src="/images/logo-cream.png"
            alt="DXE Solutions"
            fill
            style={{ objectFit: 'contain', objectPosition: 'center' }}
            priority
          />
        </div>

        <div className={styles.eyebrow}>Permitting &amp; Project Management</div>

        <h1 className={`display ${styles.title}`}>
          Something great is <em>coming soon.</em>
        </h1>

        <p className={styles.sub}>
          Our new website is being built. In the meantime, DXE Solutions is ready to help
          you navigate permitting, inspections, scheduling, and everything between the
          plans and the keys. Reach out directly and we&apos;ll get right back to you.
        </p>

        <div className={styles.actions}>
          <a href="mailto:dixie@dxesolutions.com" className="btn-gold">
            Email Us
          </a>
        </div>

        <div className={styles.detail}>
          <span className={styles.detailLabel}>Email</span>
          <a href="mailto:dixie@dxesolutions.com" className={styles.detailVal}>
            dixie@dxesolutions.com
          </a>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Serving</span>
          <span className={styles.detailVal}>Greater Los Angeles &amp; Ventura County</span>
        </div>
      </div>

      <div className={styles.loginLinks}>
        <Link href="/login" className={styles.clientLogin}>
          Client Login
        </Link>
        <span className={styles.loginDivider} aria-hidden="true">|</span>
        <Link href="/login" className={styles.clientLogin}>
          Admin Login
        </Link>
      </div>
    </main>
  );
}
