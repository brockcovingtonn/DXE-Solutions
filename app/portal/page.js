import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';

export default async function PortalIndexPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (projects && projects.length > 0) {
    redirect(`/portal/projects/${projects[0].id}/overview`);
  }

  // Admins with no projects of their own go straight to the admin dashboard
  if (profile?.is_admin) {
    redirect('/admin/clients');
  }

  // No projects yet — show a friendly empty state
  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', fontWeight: 400, color: 'var(--navy)', marginBottom: '0.25rem' }}>
          Welcome to your portal
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#718096' }}>
          No projects have been added to your account yet.
        </p>
      </div>
      <div style={{ background: 'var(--white)', border: '1px solid rgba(11,31,58,0.08)', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: 1.7 }}>
          Once Dixie sets up your project, it will appear here automatically with status updates,
          documents, photos, and notes. If you believe this is an error, please contact{' '}
          <a href="mailto:dixie@dxesolutions.com" style={{ color: 'var(--navy)', fontWeight: 500 }}>
            dixie@dxesolutions.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
