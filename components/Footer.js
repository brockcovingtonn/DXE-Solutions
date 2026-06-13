import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          DXE<span>.</span> Solutions
        </div>
        <div className={styles.copy}>
          © {new Date().getFullYear()} DXE Solutions. All rights reserved. Licensed Civil
          Engineer, State of California.
        </div>
      </div>
    </footer>
  );
}
