'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import FloatingChat from '@/components/FloatingChat';
import FloatingAssistant from '@/components/FloatingAssistant';
import { getStoredTheme } from '@/lib/theme';
import styles from './PortalShell.module.css';

export default function EmployeeShell({ profile, currentUserId, chatThreads, assistantProjects, children }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();
  const firstName = profile?.first_name || 'Team';

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <div className={styles.portal} data-theme={theme === 'system' ? undefined : theme}>
      <nav className={styles.navbar}>
        <div className={styles.navLogoArea}>
          <div className={styles.navLogoImg}>
            <Image
              src="/images/logo-cream.png"
              alt="DXE Solutions"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </div>
        <div className={styles.navInner}>
          <div className={styles.userArea}>
            <span className={styles.welcome}>
              Signed in as <strong>{firstName}</strong>
            </span>
            <Link href="/portal/settings" className={styles.avatar} title="Account Settings" aria-label="Account Settings">
              {initials || 'T'}
            </Link>
            <button className={styles.signOutBtn} onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
            <button
              type="button"
              className={styles.mobileNavToggle}
              onClick={() => setNavOpen((o) => !o)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
            >
              <i className={`ti ${navOpen ? 'ti-x' : 'ti-menu-2'}`} aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className={styles.body}>
        <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`} onClick={() => setNavOpen(false)}>
          <div className={styles.sidebarSectionLabel}>Team</div>
          <SidebarLink
            href="/employee/dashboard"
            icon="ti-layout-dashboard"
            label="My Projects"
            active={pathname.startsWith('/employee/dashboard')}
          />
          <SidebarLink
            href="/employee/calendar"
            icon="ti-calendar"
            label="Calendar"
            active={pathname.startsWith('/employee/calendar')}
          />
          <SidebarLink
            href="/employee/training"
            icon="ti-school"
            label="Training"
            active={pathname.startsWith('/employee/training')}
          />
          <SidebarLink
            href="/employee/assistant"
            icon="ti-sparkles"
            label="Assistant"
            active={pathname.startsWith('/employee/assistant')}
          />
        </aside>

        <main className={styles.main}>{children}</main>
      </div>

      {currentUserId && chatThreads && <FloatingChat currentUserId={currentUserId} threads={chatThreads} />}
      {assistantProjects && <FloatingAssistant projects={assistantProjects} initialProjectId={assistantProjects[0]?.id} />}
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
