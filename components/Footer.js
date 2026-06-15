import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logoImg}>
          <Image
            src="/images/logo-slate.png"
            alt="DXE Solutions"
            fill
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
          />
        </div>
        <div className={styles.copy}>
          © {new Date().getFullYear()} DXE Solutions. All rights reserved. Licensed Civil
          Engineer, State of California.
        </div>
      </div>
    </footer>
  );
}
