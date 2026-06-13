import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import PortalShell from '@/components/PortalShell';

export default async function PortalLayout({ children }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <PortalShell profile={profile} projects={projects || []}>
      {children}
    </PortalShell>
  );
}
