import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import PortalShell from '@/components/PortalShell';

export default async function PortalLayout({ children }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin, is_employee, has_seen_portal_tour')
    .eq('id', user.id)
    .single();

  const [{ data: projects }, { data: unread }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_unread_message_counts'),
  ]);

  const unreadByProject = Object.fromEntries(
    (unread || []).filter((r) => r.project_id).map((r) => [r.project_id, r.unread_count])
  );
  const dmUnread = (unread || []).find((r) => !r.project_id)?.unread_count || 0;

  const chatThreads = [
    ...(projects || []).map((p) => ({
      key: `project-${p.id}`,
      label: p.name,
      sublabel: 'Project',
      projectId: p.id,
      unread: unreadByProject[p.id] || 0,
    })),
    { key: 'admin-dm', label: 'Chat with DXE Solutions', sublabel: 'General', dmUserId: user.id, unread: dmUnread },
  ];

  return (
    <PortalShell
      profile={profile}
      projects={projects || []}
      isAdmin={profile?.is_admin}
      unreadByProject={unreadByProject}
      currentUserId={user.id}
      chatThreads={chatThreads}
    >
      {children}
    </PortalShell>
  );
}
