import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import SettingsForm from '@/components/SettingsForm';
import styles from '@/components/portal-shared.module.css';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Account Settings</h1>
        <p>Manage your account details and preferences</p>
      </div>

      <div className={styles.fullWidthCard} style={{ maxWidth: '520px' }}>
        <h3>Profile</h3>
        <SettingsForm profile={profile} email={user.email} />
      </div>
    </div>
  );
}
