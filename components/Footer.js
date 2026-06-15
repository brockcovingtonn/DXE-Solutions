import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Image
          src="/images/logo-cream.png"
          alt="DXE Solutions"
          width={1229}
          height={347}
          className={styles.logoImg}
        />
        <div className={styles.copy}>
          © {new Date().getFullYear()} DXE Solutions. All rights reserved. Licensed Civil
          Engineer, State of California.
        </div>
      </div>
    </footer>
  );
}
