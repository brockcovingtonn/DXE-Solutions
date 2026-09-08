'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import FloatingChat from '@/components/FloatingChat';
import FloatingAssistant from '@/components/FloatingAssistant';
import OnboardingTour from '@/components/OnboardingTour';
import GlobalSearch from '@/components/GlobalSearch';
import { getStoredTheme } from '@/lib/theme';
import styles from './PortalShell.module.css';

export default function PortalShell({ profile, projects, isAdmin, unreadByProject, currentUserId, chatThreads, children }) {
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

  // Figure out which project is "active" based on the URL: /portal/projects/[id]/...
  const activeProjectId = pathname.startsWith('/portal/projects/') ? pathname.split('/')[3] : null;

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function projectBasePath(id) {
    return `/portal/projects/${id}`;
  }

  // Determine which sub-section is active for the currently selected project
  const subPath = pathname.split('/')[4] || 'overview';

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
          <GlobalSearch role="client" />
          <div className={styles.userArea}>
            <span className={styles.welcome}>
              Welcome back, <strong>{firstName}</strong>
            </span>
            <Link href="/portal/settings" className={styles.avatar} title="Account Settings" aria-label="Account Settings">
              {initials || 'U'}
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
          <SidebarLink href="/portal" icon="ti-home" label="Dashboard" active={pathname === '/portal'} />
          <SidebarLink
            href="/portal/calendar"
            icon="ti-calendar"
            label="Calendar"
            active={pathname === '/portal/calendar'}
          />

          {projects && projects.length > 0 && (
            <>
              <div className={styles.sidebarSectionLabel}>My Projects</div>
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`${projectBasePath(p.id)}/overview`}
                  className={`${styles.sidebarProject} ${
                    p.id === activeProjectId ? styles.sidebarProjectSelected : ''
                  }`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className={styles.projName}>{p.name}</div>
                    {unreadByProject?.[p.id] > 0 && (
                      <span
                        style={{
                          background: 'var(--gold)',
                          color: 'var(--navy-dark)',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '0.05rem 0.4rem',
                          borderRadius: '999px',
                        }}
                      >
                        {unreadByProject[p.id]}
                      </span>
                    )}
                  </div>
                  <div className={styles.projStatus}>
                    {p.status === 'active' ? '● Active' : `● ${capitalize(p.status)}`}
                  </div>
                </Link>
              ))}
            </>
          )}

          {activeProjectId && (
            <>
              <div className={styles.sidebarSectionLabel}>Project</div>
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/overview`}
                icon="ti-layout-dashboard"
                label="Overview"
                active={subPath === 'overview'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/calendar`}
                icon="ti-calendar"
                label="Calendar"
                active={subPath === 'calendar'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/permits`}
                icon="ti-file-certificate"
                label="Permits"
                active={subPath === 'permits'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/utilities`}
                icon="ti-bolt"
                label="Utilities"
                active={subPath === 'utilities'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/accounting`}
                icon="ti-receipt"
                label="Accounting"
                active={subPath === 'accounting'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/documents`}
                icon="ti-files"
                label="Documents"
                active={subPath === 'documents'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/photos`}
                icon="ti-photo"
                label="Photos"
                active={subPath === 'photos'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/notes`}
                icon="ti-notes"
                label="Notes & Updates"
                active={subPath === 'notes'}
              />
              <SidebarLink
                href={`${projectBasePath(activeProjectId)}/review`}
                icon="ti-star"
                label="Leave a Review"
                active={subPath === 'review'}
              />
            </>
          )}

          {(!projects || projects.length === 0) && !activeProjectId && (
            <div className={styles.sidebarSectionLabel}>No projects yet</div>
          )}

          <div className={styles.sidebarSectionLabel}>Account</div>
          <SidebarLink
            href="/portal/settings"
            icon="ti-settings"
            label="Account Settings"
            active={pathname === '/portal/settings'}
          />
          {profile?.is_admin && (
            <SidebarLink
              href="/admin/clients"
              icon="ti-lock-access"
              label="Master Dashboard"
              active={false}
            />
          )}
          <SidebarLink
            href="/portal/assistant"
            icon="ti-sparkles"
            label="Assistant"
            active={pathname === '/portal/assistant'}
          />
        </aside>

        <main className={styles.main}>
          {isAdmin && activeProjectId && !projects?.some((p) => p.id === activeProjectId) && (
            <div className={styles.adminPreviewBanner}>
              <i className="ti ti-eye" aria-hidden="true"></i>
              Previewing as the client would see this project.
              <Link href="/admin/clients" className={styles.adminPreviewLink}>
                Back to admin
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>

      {currentUserId && chatThreads && <FloatingChat currentUserId={currentUserId} threads={chatThreads} />}
      <FloatingAssistant projects={projects || []} initialProjectId={activeProjectId} />
      {currentUserId && !profile?.is_admin && !profile?.is_employee && (
        <OnboardingTour userId={currentUserId} initialSeen={profile?.has_seen_portal_tour} />
      )}
    </div>
  );
}

function SidebarLink({ href, icon, label, active, badge }) {
  return (
    <Link href={href} className={`${styles.sidebarLink} ${active ? styles.sidebarLinkActive : ''}`}>
      <i className={`ti ${icon}`} aria-hidden="true"></i> {label}
      {badge > 0 && (
        <span
          style={{
            marginLeft: 'auto',
            background: 'var(--gold)',
            color: 'var(--navy-dark)',
            fontSize: '0.62rem',
            fontWeight: 700,
            padding: '0.05rem 0.4rem',
            borderRadius: '999px',
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
