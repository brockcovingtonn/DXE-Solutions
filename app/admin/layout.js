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

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
