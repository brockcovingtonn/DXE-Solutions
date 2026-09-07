import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminShell from '@/components/AdminShell';

export default async function AdminLayout({ children }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/portal');

  const [{ data: projects }, { data: people }, { data: unread }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, profiles!projects_owner_id_fkey(first_name, last_name)')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, is_employee')
      .eq('is_admin', false)
      .order('first_name'),
    supabase.rpc('get_unread_message_counts'),
  ]);

  const dmUnread = {};
  (unread || []).forEach((r) => {
    if (r.dm_user_id) dmUnread[r.dm_user_id] = r.unread_count;
  });

  const chatThreads = (people || []).map((p) => ({
    key: `dm-${p.id}`,
    label: `${p.first_name} ${p.last_name}`.trim() || 'Unnamed',
    sublabel: p.is_employee ? 'Employee' : 'Client',
    dmUserId: p.id,
    unread: dmUnread[p.id] || 0,
  }));

  return (
    <AdminShell profile={profile} currentUserId={user.id} chatThreads={chatThreads} assistantProjects={projects || []}>
      {children}
    </AdminShell>
  );
}
