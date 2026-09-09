import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-server';
import { canAccessAsStaff } from '@/lib/project-access';
import PrintButton from '@/components/PrintButton';
import { PERMIT_STATUSES } from '@/lib/constants';
import styles from './page.module.css';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function CoverSheetPage({ params }) {
  const supabase = createClient();
  const projectId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const allowed = await canAccessAsStaff(supabase, projectId, user.id);
  if (!allowed) redirect('/login');

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles!projects_owner_id_fkey(first_name, last_name, email, phone)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const [{ data: team }, { data: interestedParties }, { data: phases }, { data: permits }] = await Promise.all([
    supabase.from('project_team').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_interested_parties').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('permits').select('*').eq('project_id', projectId).order('sort_order'),
  ]);

  const client = project.profiles;
  const generatedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <PrintButton className="btn-navy" />
      </div>

      <div className={styles.sheet}>
        <div className={styles.watermark} aria-hidden="true">
          <Image
            src="/images/logo-black.png"
            alt=""
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div className={styles.header}>
          <div className={styles.logo}>
            <Image
              src="/images/logo-cream.png"
              alt="DXE Solutions"
              fill
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
            />
          </div>
          <div className={styles.headerMeta}>
            <div className={styles.docTitle}>Project Cover Sheet</div>
            <div className={styles.docDate}>Generated {generatedOn}</div>
          </div>
        </div>
        <div className={styles.headerAccent} />

        <div className={styles.body}>
        <h1 className={styles.projectName}>{project.name}</h1>
        <p className={styles.projectAddress}>{project.address || 'Address not on file'}</p>

        <div className={styles.grid}>
          <Field label="Project Type" value={project.project_type} />
          <Field label="Status" value={capitalize(project.status)} />
          <Field label="Progress" value={`${project.progress_pct ?? 0}%`} />
          <Field label="Start Date" value={formatDate(project.started_on)} />
          <Field label="Est. Completion" value={formatDate(project.estimated_completion)} />
          <Field label="Prepared By" value="DXE Solutions" />
        </div>

        <div className={styles.grid}>
          <Field label="APN / Parcel Number" value={project.apn} />
          <Field label="Jurisdiction" value={project.jurisdiction} />
          <Field label="Zoning" value={project.zoning} />
          <Field label="Lot Size" value={project.lot_size} />
          <Field label="Building Size" value={project.building_size} />
        </div>

        <div className={styles.section}>
          <h2>Permits</h2>
          {permits && permits.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Permit #</th>
                  <th>Agency</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {permits.map((p) => (
                  <tr key={p.id}>
                    <td>{p.permit_type}</td>
                    <td>{p.permit_number || '—'}</td>
                    <td>{p.agency || '—'}</td>
                    <td>{PERMIT_STATUSES.find((s) => s.value === p.status)?.label || p.status}</td>
                    <td>{formatDate(p.issued_date)}</td>
                    <td>{formatDate(p.expiration_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>No permits on file.</p>
          )}
        </div>

        <div className={styles.section}>
          <h2>Owner / Client</h2>
          {client ? (
            <div className={styles.grid}>
              <Field label="Name" value={`${client.first_name || ''} ${client.last_name || ''}`.trim() || '—'} />
              <Field label="Email" value={client.email} />
              <Field label="Phone" value={client.phone} />
            </div>
          ) : (
            <p className={styles.empty}>No client on file.</p>
          )}
        </div>

        <div className={styles.section}>
          <h2>Project Team</h2>
          {team && team.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role / Trade</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>{m.trade}</td>
                    <td>{m.name || '—'}</td>
                    <td>{m.phone || '—'}</td>
                    <td>{m.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>No team members on file.</p>
          )}
        </div>

        <div className={styles.section}>
          <h2>Interested Parties</h2>
          {interestedParties && interestedParties.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Relationship</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {interestedParties.map((p) => (
                  <tr key={p.id}>
                    <td>{p.relationship || '—'}</td>
                    <td>{p.name}</td>
                    <td>{p.phone || '—'}</td>
                    <td>{p.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>No interested parties on file.</p>
          )}
        </div>

        <div className={styles.section}>
          <h2>Project Phases</h2>
          {phases && phases.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Complete</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((ph) => (
                  <tr key={ph.id}>
                    <td>{ph.name}</td>
                    <td>{capitalize(ph.state)}</td>
                    <td>{ph.state === 'na' ? '—' : `${ph.pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>No phases on file.</p>
          )}
        </div>

        <div className={styles.footer}>
          DXE Solutions · Permitting &amp; Project Management · dixie@dxesolutions.com
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value || '—'}</div>
    </div>
  );
}

function capitalize(s) {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
