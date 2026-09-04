import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export const metadata = {
  title: 'Privacy Policy | DXE Solutions',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className={`section ${styles.privacySection}`}>
          <div className={`section-inner ${styles.wrap}`}>
            <div className="section-header">
              <div className="section-eyebrow">Legal</div>
              <h2 className="display" style={{ color: 'var(--navy)' }}>
                Privacy Policy
              </h2>
            </div>
            <p className={styles.updated}>Last updated September 3, 2026</p>

            <p>
              DXE Solutions (&quot;DXE,&quot; &quot;we,&quot; &quot;us&quot;) provides permitting and project
              management services for civil engineering and property development projects, including
              a client and team portal at this website. This policy explains what information we
              collect, how we use it, and the choices you have.
            </p>

            <h2>Information we collect</h2>
            <p>When you request an estimate, become a client, or use the portal, we collect:</p>
            <ul>
              <li><strong>Account information</strong> — name, email address, and phone number, for anyone with a portal login (clients, team members, and admins).</li>
              <li><strong>Project information</strong> — address, project type, permits, utilities, schedule, and accounting details for any project we manage on your behalf.</li>
              <li><strong>Files you or we upload</strong> — documents and photos attached to a project.</li>
              <li><strong>Messages</strong> — chat messages sent within the portal between clients, team members, and admins.</li>
              <li><strong>Estimate and contact form submissions</strong> — name, email, phone, and project details you submit through the website.</li>
              <li><strong>Calendar events</strong> — project and firm scheduling information, optionally synced to a connected Google Calendar (admin accounts only).</li>
              <li><strong>Basic usage data</strong> — standard web server and hosting logs (e.g. IP address, browser type) collected automatically by our hosting provider.</li>
            </ul>

            <h2>How we use it</h2>
            <p>We use this information to:</p>
            <ul>
              <li>Provide and operate the client/team portal, including project tracking, document sharing, scheduling, and messaging.</li>
              <li>Respond to estimate requests and general inquiries.</li>
              <li>Send email notifications about project updates (you can turn these off any time in Account Settings).</li>
              <li>Power the in-portal AI assistant, which can answer questions and take actions (like updating a calendar event) using your account's own project data. Assistant conversations are not stored on our servers — they exist only in your browser for that session.</li>
              <li>Maintain the security and integrity of the portal.</li>
            </ul>

            <h2>How we store and protect it</h2>
            <p>
              Portal data is stored with Supabase, a hosted database and authentication provider, and
              protected by row-level security rules that restrict each account to only the data it's
              authorized to see — for example, a client can only ever see their own project(s), and a
              team member only the project(s) they're assigned to. The website is hosted on Vercel.
            </p>

            <h2>Third-party services</h2>
            <p>We rely on a small number of third-party services to operate the portal:</p>
            <ul>
              <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
              <li><strong>Vercel</strong> — website hosting.</li>
              <li><strong>Resend</strong> — delivery of transactional emails (notifications, estimate confirmations).</li>
              <li><strong>Anthropic</strong> — processes messages sent to the in-portal AI assistant, when used.</li>
              <li><strong>Google Calendar API</strong> — used only if an admin account chooses to connect a Google Calendar for one-way event syncing.</li>
            </ul>
            <p>
              We do not sell your information, and we do not share it with third parties for their own
              marketing purposes.
            </p>

            <h2>Your choices</h2>
            <p>
              You can review and update your account information any time from Account Settings, including
              turning project-update emails on or off. To request a copy of your data, or to request that
              we delete your account and associated data, contact us at the email below.
            </p>

            <h2>Children's privacy</h2>
            <p>
              This portal is intended for business use by adults and is not directed at children under 13.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              If we make material changes to this policy, we'll update the date at the top of this page.
            </p>

            <h2>Contact us</h2>
            <p>
              Questions about this policy or your data? Email us at{' '}
              <a href="mailto:dixie@dxesolutions.com">dixie@dxesolutions.com</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
