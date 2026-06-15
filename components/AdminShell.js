'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import styles from './PortalShell.module.css';

export default function AdminShell({ profile, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();
  const firstName = profile?.first_name || 'Admin';

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className={styles.portal}>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.navLogoArea}>
            <div className={styles.navLogoImg}>
              <Image
                src="/images/logo-gold.png"
                alt="DXE Solutions"
                fill
                style={{ objectFit: 'contain', objectPosition: 'left center' }}
                priority
              />
            </div>
            <span className={styles.logoSub}>Admin</span>
          </div>
          <div className={styles.userArea}>
            <span className={styles.welcome}>
              Signed in as <strong>{firstName}</strong>
            </span>
            <div className={styles.avatar}>{initials || 'A'}</div>
            <button className={styles.signOutBtn} onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </nav>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSectionLabel}>Admin</div>
          <SidebarLink
            href="/admin/dashboard"
            icon="ti-layout-dashboard"
            label="Dashboard"
            active={pathname.startsWith('/admin/dashboard')}
          />
          <SidebarLink
            href="/admin/clients"
            icon="ti-users"
            label="Clients & Projects"
            active={pathname.startsWith('/admin/clients') || pathname.startsWith('/admin/projects')}
          />
          <SidebarLink
            href="/admin/contacts"
            icon="ti-address-book"
            label="Contacts"
            active={pathname.startsWith('/admin/contacts')}
          />
          <SidebarLink
            href="/admin/templates"
            icon="ti-file-stack"
            label="Templates"
            active={pathname.startsWith('/admin/templates')}
          />
        </aside>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }) {
  return (
    <Link href={href} className={`${styles.sidebarLink} ${active ? styles.sidebarLinkActive : ''}`}>
      <i className={`ti ${icon}`} aria-hidden="true"></i> {label}
    </Link>
  );
}
