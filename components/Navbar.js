'use client';

import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          DXE<span>.</span> Solutions
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
      </div>
    </nav>
  );
}
