'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';

export default function ClientsProjectsTabs() {
  const pathname = usePathname();
  const onProjects = pathname.startsWith('/admin/projects');

  return (
    <div className={adminStyles.subTabs}>
      <Link
        href="/admin/clients"
        className={`${adminStyles.subTab} ${!onProjects ? adminStyles.subTabActive : ''}`}
      >
        Clients
      </Link>
      <Link
        href="/admin/projects"
        className={`${adminStyles.subTab} ${onProjects ? adminStyles.subTabActive : ''}`}
      >
        Projects
      </Link>
    </div>
  );
}
