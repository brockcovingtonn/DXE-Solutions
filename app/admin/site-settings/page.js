import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import styles from '@/components/portal-shared.module.css';
import SiteSettingsForm from '@/components/SiteSettingsForm';
import GoogleCalendarConnection from '@/components/GoogleCalendarConnection';
import BookingAvailabilityForm from '@/components/BookingAvailabilityForm';
import { getSiteSettings } from '@/lib/site-settings';
import { getBookingAvailability } from '@/lib/booking-availability';

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();
  const availability = await getBookingAvailability();

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from('google_calendar_connections')
    .select('user_id, connected_at')
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Site Settings</h1>
        <p>Feature toggles for the public marketing site</p>
      </div>

      <div className={styles.fullWidthCard}>
        <SiteSettingsForm initialSettings={settings} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Book-a-call availability</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
          Real open times, checked live against a connected Google Calendar — the first admin to connect becomes the
          calendar public bookings are checked against. If no times ever show up as available, disconnect and
          reconnect below — older connections may be missing the calendar permission this feature needs.
        </p>
        <GoogleCalendarConnection googleConnected={connection?.user_id === user?.id} />
        {connection && connection.user_id !== user?.id ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '-1rem', marginBottom: '1rem' }}>
            Public bookings are currently checked against another admin&apos;s connected calendar.
          </p>
        ) : null}
        <BookingAvailabilityForm initialAvailability={availability} />
      </div>
    </div>
  );
}
