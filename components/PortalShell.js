'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-client';
import styles from './PortalShell.module.css';

export default function PortalShell({ profile, projects, isAdmin, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase();
  const firstName = profile?.first_name || 'there';

  // Figure out which project is "active" based on the URL: /portal/projects/[id]/...
  const activeProjectId = pathname.startsWith('/portal/projects/')
    ? pathname.split('/')[3]
    : projects?.[0]?.id;

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function projectBasePath(id) {
    return `/portal/projects/${id}`;
  }

  // Determine which sub-section is active for the currently selected project
  const subPath = pathname.split('/')[4] || 'overview';

  return (
    <div className={styles.portal}>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.navLogoArea}>
            <div className={styles.navLogoImg}>
              <Image
                src="/images/logo-cream.png"
                alt="DXE Solutions"
                fill
                style={{ objectFit: 'contain', objectPosition: 'left center' }}
                priority
              />
            </div>
            <span className={styles.logoSub}>Client Portal</span>
          </div>
          <div className={styles.userArea}>
            <span className={styles.welcome}>
              Welcome back, <strong>{firstName}</strong>
            </span>
            <div className={styles.avatar}>{initials || 'U'}</div>
            <button className={styles.signOutBtn} onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </nav>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
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
                  <div className={styles.projName}>{p.name}</div>
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
                href={`${projectBasePath(activeProjectId)}/utilities`}
                icon="ti-bolt"
                label="Utilities"
                active={subPath === 'utilities'}
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
              label="Admin Dashboard"
              active={false}
            />
          )}
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

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
