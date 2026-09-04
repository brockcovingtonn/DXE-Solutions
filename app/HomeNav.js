'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function HomeNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.navLogo}>
          <Image
            src="/images/logo-gold.png"
            alt="DXE Solutions"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
            priority
          />
        </Link>
        <div className={styles.navLinks}>
          <Link href="#about">About</Link>
          <Link href="#services">Services</Link>
          <Link href="#portal">Client Portal</Link>
          <Link href="#how-it-works">How it works</Link>
          <Link href="#coverage">Coverage</Link>
          <Link href="#reviews">Reviews</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="/login" className={styles.navCta}>
            Login
          </Link>
        </div>
        <button
          type="button"
          className={styles.navMenuToggle}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true"></i>
        </button>
      </div>

      {open && (
        <div className={styles.navMobileMenu}>
          <Link href="#about" onClick={() => setOpen(false)}>About</Link>
          <Link href="#services" onClick={() => setOpen(false)}>Services</Link>
          <Link href="#portal" onClick={() => setOpen(false)}>Client Portal</Link>
          <Link href="#how-it-works" onClick={() => setOpen(false)}>How it works</Link>
          <Link href="#coverage" onClick={() => setOpen(false)}>Coverage</Link>
          <Link href="#reviews" onClick={() => setOpen(false)}>Reviews</Link>
          <Link href="#faq" onClick={() => setOpen(false)}>FAQ</Link>
          <Link href="/login" className={styles.navMobileCta} onClick={() => setOpen(false)}>
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
