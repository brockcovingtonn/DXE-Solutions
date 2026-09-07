import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import EmployeeShell from '@/components/EmployeeShell';

export default async function EmployeeLayout({ children }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_admin, is_employee')
    .eq('id', user.id)
    .single();

  if (!profile?.is_employee) {
    redirect(profile?.is_admin ? '/admin/dashboard' : '/portal');
  }

  const [{ data: assignments }, { data: unread }] = await Promise.all([
    supabase
      .from('project_employees')
      .select('projects(id, name)')
      .eq('employee_id', user.id),
    supabase.rpc('get_unread_message_counts'),
  ]);

  const dmUnread = (unread || []).find((r) => !r.project_id)?.unread_count || 0;

  const chatThreads = [
    { key: 'admin-dm', label: 'Dixie', sublabel: 'Direct message', dmUserId: user.id, unread: dmUnread },
  ];

  const assistantProjects = (assignments || []).map((a) => a.projects).filter(Boolean);

  return (
    <EmployeeShell profile={profile} currentUserId={user.id} chatThreads={chatThreads} assistantProjects={assistantProjects}>
      {children}
    </EmployeeShell>
  );
}
