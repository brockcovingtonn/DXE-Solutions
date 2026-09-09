'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import FloatingChat from '@/components/FloatingChat';
import FloatingAssistant from '@/components/FloatingAssistant';
import GlobalSearch from '@/components/GlobalSearch';
import { getStoredTheme } from '@/lib/theme';
import styles from './PortalShell.module.css';

export default function AdminShell({ profile, currentUserId, chatThreads, assistantProjects, children }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();
  const firstName = profile?.first_name || 'there';

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
          <GlobalSearch role="admin" />
          <div className={styles.userArea}>
            <span className={styles.welcome}>
              Signed in as <strong>{firstName}</strong>
            </span>
            <Link href="/portal/settings" className={styles.avatar} title="Account Settings" aria-label="Account Settings">
              {initials || 'A'}
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
            href="/admin/calendar"
            icon="ti-calendar"
            label="Calendar"
            active={pathname.startsWith('/admin/calendar')}
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
          <SidebarLink
            href="/admin/accounting"
            icon="ti-receipt"
            label="Accounting"
            active={pathname.startsWith('/admin/accounting')}
          />
          <SidebarLink
            href="/admin/employees"
            icon="ti-user-cog"
            label="Employees"
            active={pathname.startsWith('/admin/employees')}
          />
          <SidebarLink
            href="/admin/training"
            icon="ti-school"
            label="Training"
            active={pathname.startsWith('/admin/training')}
          />
          <SidebarLink
            href="/admin/reviews"
            icon="ti-star"
            label="Reviews"
            active={pathname.startsWith('/admin/reviews')}
          />
          <SidebarLink
            href="/admin/assistant"
            icon="ti-sparkles"
            label="Assistant"
            active={pathname.startsWith('/admin/assistant')}
          />
          <SidebarLink
            href="/admin/brand-kit"
            icon="ti-palette"
            label="Brand Kit"
            active={pathname.startsWith('/admin/brand-kit')}
          />
          <SidebarLink
            href="/portal/settings"
            icon="ti-settings"
            label="Account Settings"
            active={pathname === '/portal/settings'}
          />
        </aside>

        <main className={styles.main}>{children}</main>
      </div>

      {currentUserId && chatThreads && <FloatingChat currentUserId={currentUserId} threads={chatThreads} />}
      {assistantProjects && <FloatingAssistant projects={assistantProjects} />}
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
