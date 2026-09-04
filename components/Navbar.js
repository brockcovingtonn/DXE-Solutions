'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/logo-gold.png"
            alt="DXE Solutions"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
            priority
          />
        </Link>
        <div className={styles.links}>
          <Link href="/#about">About</Link>
          <Link href="/#services">What We Do</Link>
          <Link href="/#projects">Projects</Link>
          <Link href="/estimate">Get an Estimate</Link>
          <Link href="/#contact">Contact</Link>
          <Link href="/login" className={styles.cta}>
            Client Login
          </Link>
        </div>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true"></i>
        </button>
      </div>

      {open && (
        <div className={styles.mobileMenu}>
          <Link href="/#about" onClick={() => setOpen(false)}>About</Link>
          <Link href="/#services" onClick={() => setOpen(false)}>What We Do</Link>
          <Link href="/#projects" onClick={() => setOpen(false)}>Projects</Link>
          <Link href="/estimate" onClick={() => setOpen(false)}>Get an Estimate</Link>
          <Link href="/#contact" onClick={() => setOpen(false)}>Contact</Link>
          <Link href="/login" className={styles.mobileCta} onClick={() => setOpen(false)}>
            Client Login
          </Link>
        </div>
      )}
    </nav>
  );
}
