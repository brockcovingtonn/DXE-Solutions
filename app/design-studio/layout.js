import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AdminShell from '@/components/AdminShell';
import EmployeeShell from '@/components/EmployeeShell';

// DXE-specific chrome for the Design Studio feature — the one other file
// (besides lib/design-studio/server.js and the middleware carve-out) that
// isn't portable if this ever moves to its own site. Everything under
// /design-studio is reachable by both admins and employees (see
// middleware.js), so this picks whichever shell the signed-in user
// actually belongs to and loads that shell's own nav data, mirroring
// app/admin/layout.js and app/employee/layout.js.
export default async function DesignStudioLayout({ children }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin, is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin && !profile?.is_employee) redirect('/portal');

  if (profile.is_admin) {
    const [{ data: projects }, { data: people }, { data: unread }, { count: pendingAccountingCount }] = await Promise.all([
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
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
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
      <AdminShell profile={profile} currentUserId={user.id} chatThreads={chatThreads} assistantProjects={projects || []} pendingAccountingCount={pendingAccountingCount || 0}>
        {children}
      </AdminShell>
    );
  }

  const [{ data: assignments }, { data: unread }] = await Promise.all([
    supabase
      .from('project_employees')
      .select('projects(id, name)')
      .eq('employee_id', user.id),
    supabase.rpc('get_unread_message_counts'),
  ]);

  const dmUnread = (unread || []).find((r) => !r.project_id)?.unread_count || 0;
  const unreadByProject = Object.fromEntries((unread || []).filter((r) => r.project_id).map((r) => [r.project_id, r.unread_count]));

  const assistantProjects = (assignments || []).map((a) => a.projects).filter(Boolean);

  const chatThreads = [
    { key: 'admin-dm', label: 'Dixie', sublabel: 'Direct message', dmUserId: user.id, unread: dmUnread },
    ...assistantProjects.map((p) => ({
      key: `project-${p.id}`,
      label: p.name,
      sublabel: 'Project chat',
      projectId: p.id,
      unread: unreadByProject[p.id] || 0,
    })),
  ];

  return (
    <EmployeeShell profile={profile} currentUserId={user.id} chatThreads={chatThreads} assistantProjects={assistantProjects}>
      {children}
    </EmployeeShell>
  );
}
