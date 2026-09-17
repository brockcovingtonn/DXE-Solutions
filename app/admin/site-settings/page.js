import styles from '@/components/portal-shared.module.css';
import SiteSettingsForm from '@/components/SiteSettingsForm';
import { getSiteSettings } from '@/lib/site-settings';

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Site Settings</h1>
        <p>Feature toggles for the public marketing site</p>
      </div>

      <div className={styles.fullWidthCard}>
        <SiteSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
