import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import EmptyState from '@/components/EmptyState';
import EmployeeActionItems from '@/components/EmployeeActionItems';
import DocumentUpload from '@/components/DocumentUpload';
import NewNoteForm from '@/components/NewNoteForm';
import ClientCalendar from '@/components/ClientCalendar';
import PhaseBar from '@/components/PhaseBar';
import PhotoGrid from '@/components/PhotoGrid';
import { PERMIT_STATUSES } from '@/lib/constants';
import { UTILITY_TYPES, UTILITY_STATUSES } from '@/lib/constants';

const UTILITY_ICONS = { electrical: 'ti-bolt', water: 'ti-droplet', gas: 'ti-flame' };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function EmployeeProjectPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, '*, profiles!projects_owner_id_fkey(first_name, last_name, email)');
  if (!project) notFound();

  const [
    { data: phases },
    { data: milestones },
    { data: team },
    { data: interestedParties },
    { data: actionItems },
    { data: permits },
    { data: utilities },
    { data: docs },
    { data: photos },
    { data: invoices },
    { data: notes },
    { data: calendarEvents },
  ] = await Promise.all([
    supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_team').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('project_interested_parties').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('action_items').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.rpc('get_project_permits', { p_project_id: projectId }),
    supabase.rpc('get_project_utilities', { p_project_id: projectId }),
    supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('photos').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('calendar_events').select('*').eq('project_id', projectId).order('start_time'),
  ]);

  let photosWithUrls = [];
  if (photos && photos.length > 0) {
    photosWithUrls = await Promise.all(
      photos.map(async (p) => {
        const { data } = await supabase.storage.from('project-photos').createSignedUrl(p.file_path, 3600);
        return { ...p, url: data?.signedUrl };
      })
    );
  }

  const visibleUtilities = (utilities || []).filter((u) => u.enabled);
  const client = project.profiles;
  const balance = (invoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div>
      <Link href="/employee/dashboard" className={styles.cardAction} style={{ display: 'inline-flex', marginBottom: '1rem' }}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to my projects
      </Link>

      <div className={styles.portalHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>{project.name}</h1>
            <p>
              {client ? `${client.first_name} ${client.last_name}` : 'No client on file'} · {project.address || 'No address on file'}
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/cover-sheet`}
            target="_blank"
            style={{ fontSize: '0.78rem', color: 'var(--navy)', fontWeight: 500 }}
          >
            <i className="ti ti-file-description" aria-hidden="true"></i> Cover sheet
          </Link>
        </div>
      </div>

      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Overall Progress</div>
          <div className={styles.scValue}>{project.progress_pct || 0}%</div>
          <div className={styles.scBar}>
            <div className={styles.scBarFill} style={{ width: `${project.progress_pct || 0}%` }} />
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Status</div>
          <div className={styles.scValueSmall}>{capitalize(project.status)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Project Start</div>
          <div className={styles.scValueSmall}>{formatDate(project.started_on)}</div>
          <div className={styles.scSub}>Est. complete {formatDate(project.estimated_completion)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Documents</div>
          <div className={styles.scValue}>{docs?.length || 0}</div>
          <div className={styles.scSub}>on file</div>
        </div>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
          <div>
            <div className={styles.ufLabel}>Type</div>
            <div className={styles.ufValue}>{project.project_type || '—'}</div>
          </div>
          <div>
            <div className={styles.ufLabel}>APN</div>
            <div className={styles.ufValue}>{project.apn || '—'}</div>
          </div>
          <div>
            <div className={styles.ufLabel}>Jurisdiction</div>
            <div className={styles.ufValue}>{project.jurisdiction || '—'}</div>
          </div>
          <div>
            <div className={styles.ufLabel}>Zoning</div>
            <div className={styles.ufValue}>{project.zoning || '—'}</div>
          </div>
          <div>
            <div className={styles.ufLabel}>Lot Size</div>
            <div className={styles.ufValue}>{project.lot_size || '—'}</div>
          </div>
          <div>
            <div className={styles.ufLabel}>Building Size</div>
            <div className={styles.ufValue}>{project.building_size || '—'}</div>
          </div>
        </div>
      </div>

      {phases && phases.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Project Phases</h3>
          <PhaseBar phases={phases} />
        </div>
      )}

      {team && team.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Project Team</h3>
          <div className={styles.teamGrid}>
            {team.map((member) => (
              <div className={styles.teamCard} key={member.id}>
                <div className={styles.teamTrade}>{member.trade}</div>
                <div className={styles.teamName}>{member.name || '—'}</div>
                {member.phone && (
                  <div className={styles.teamContact}>
                    <i className="ti ti-phone" aria-hidden="true"></i> {member.phone}
                  </div>
                )}
                {member.email && (
                  <div className={styles.teamContact}>
                    <i className="ti ti-mail" aria-hidden="true"></i> {member.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {interestedParties && interestedParties.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Interested Parties</h3>
          <div className={styles.teamGrid}>
            {interestedParties.map((party) => (
              <div className={styles.teamCard} key={party.id}>
                {party.relationship && <div className={styles.teamTrade}>{party.relationship}</div>}
                <div className={styles.teamName}>{party.name}</div>
                {party.phone && (
                  <div className={styles.teamContact}>
                    <i className="ti ti-phone" aria-hidden="true"></i> {party.phone}
                  </div>
                )}
                {party.email && (
                  <div className={styles.teamContact}>
                    <i className="ti ti-mail" aria-hidden="true"></i> {party.email}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.fullWidthCard}>
        <h3>Permits</h3>
        {!permits || permits.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No permits have been added for this project yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {permits.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                }}
              >
                <div>
                  <div className={styles.ufLabel}>Type</div>
                  <div className={styles.ufValue}>{p.permit_type}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Permit #</div>
                  <div className={styles.ufValue}>{p.permit_number || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Agency</div>
                  <div className={styles.ufValue}>{p.agency || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Status</div>
                  <div className={styles.ufValue}>{PERMIT_STATUSES.find((s) => s.value === p.status)?.label || p.status}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Issued</div>
                  <div className={styles.ufValue}>{p.issued_date || '—'}</div>
                </div>
                <div>
                  <div className={styles.ufLabel}>Expires</div>
                  <div className={styles.ufValue}>{p.expiration_date || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Utilities</h3>
        {visibleUtilities.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No utility information has been added yet.</p>
        ) : (
          UTILITY_TYPES.filter((t) => visibleUtilities.some((u) => u.utility_type === t.value)).map((type) => {
            const u = visibleUtilities.find((x) => x.utility_type === type.value);
            const entries = u.entries || [];
            return (
              <div className={styles.utilityBlock} key={type.value}>
                <div className={styles.utilityHeader}>
                  <i className={`ti ${UTILITY_ICONS[type.value]}`} aria-hidden="true"></i> {type.label}
                </div>
                {(u.contact_name || u.contact_trade || u.contact_phone || u.contact_email) && (
                  <div className={styles.utilityContact}>
                    {u.contact_trade && (
                      <span>
                        <strong>{u.contact_trade}</strong>
                      </span>
                    )}
                    {u.contact_name && <span>{u.contact_name}</span>}
                    {u.contact_phone && <span>{u.contact_phone}</span>}
                    {u.contact_email && <span>{u.contact_email}</span>}
                  </div>
                )}
                {entries.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>No updates yet.</p>
                ) : (
                  entries.map((entry) => (
                    <div className={styles.utilityTable} key={entry.id}>
                      <div className={styles.utilityField}>
                        <div className={styles.ufLabel}>Application</div>
                        <div className={styles.ufValue}>{entry.application || '—'}</div>
                      </div>
                      <div className={styles.utilityField}>
                        <div className={styles.ufLabel}>Work Request #</div>
                        <div className={styles.ufValue}>{entry.work_request_number || '—'}</div>
                      </div>
                      <div className={styles.utilityField}>
                        <div className={styles.ufLabel}>Status</div>
                        <div className={styles.ufValue}>{UTILITY_STATUSES.find((s) => s.value === entry.status)?.label || entry.status}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })
        )}
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Action Items</h3>
        <EmployeeActionItems initialItems={actionItems || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Calendar</h3>
        <ClientCalendar events={calendarEvents || []} />
      </div>

      {milestones && milestones.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Milestones</h3>
          <div className={styles.statusSteps}>
            {milestones.map((m) => (
              <div className={styles.statusStep} key={m.id}>
                <div
                  className={`${styles.stepDot} ${
                    m.state === 'done' ? styles.stepDotDone : m.state === 'active' ? styles.stepDotActive : styles.stepDotPending
                  }`}
                >
                  {m.state === 'done' ? (
                    <i className="ti ti-check" style={{ fontSize: '0.75rem' }}></i>
                  ) : m.state === 'active' ? (
                    <i className="ti ti-clock" style={{ fontSize: '0.75rem' }}></i>
                  ) : (
                    '·'
                  )}
                </div>
                <div>
                  <div className={styles.stepName}>{m.name}</div>
                  <div className={styles.stepDate}>{m.display_date}</div>
                  {m.notes && <div className={styles.stepNotes}>{m.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.fullWidthCard}>
        <h3>Documents</h3>
        {!docs || docs.length === 0 ? (
          <EmptyState icon="ti-files" title="No documents yet" subtitle="Files uploaded on this project will show up here." />
        ) : (
          <div className={styles.docList}>
            {docs.map((d) => (
              <div className={styles.docItem} key={d.id}>
                <div className={styles.docIcon}>
                  <i className="ti ti-file-text" aria-hidden="true"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.docName}>{d.file_name}</div>
                  <div className={styles.docMeta}>{formatDate(d.created_at)}</div>
                </div>
                <a
                  href={`/api/documents/${d.id}/download`}
                  style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}
                  title="Download"
                >
                  <i className="ti ti-download" aria-hidden="true"></i>
                </a>
              </div>
            ))}
          </div>
        )}
        <DocumentUpload projectId={projectId} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Photos</h3>
        {photosWithUrls.length === 0 ? (
          <EmptyState icon="ti-photo-off" title="No photos yet" subtitle="Progress photos on this project will show up here." />
        ) : (
          <PhotoGrid photos={photosWithUrls} showDownload />
        )}
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Accounting</h3>
        <div
          style={{
            padding: '1.25rem',
            background: 'var(--surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Outstanding Balance
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 600, color: balance > 0 ? 'var(--text-error)' : 'var(--text-success)' }}>
            {formatCurrency(balance)}
          </div>
        </div>
        {!invoices || invoices.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No invoices or receipts on file yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {invoices.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem',
                  border: '1px solid rgba(var(--border-rgb),0.1)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.5rem',
                    background: item.kind === 'receipt' ? 'rgba(59,130,246,0.12)' : 'rgba(201,168,87,0.18)',
                    color: item.kind === 'receipt' ? '#1e40af' : '#7a5c0a',
                    flexShrink: 0,
                  }}
                >
                  {item.kind}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 500 }}>{item.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    {item.due_date ? `Due ${item.due_date}` : item.paid_date ? `Paid ${item.paid_date}` : '—'}
                    {item.status === 'unpaid' && ' · Unpaid'}
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Notes &amp; Updates</h3>
        <div className={styles.notesArea}>
          {(notes || []).map((n) => (
            <div className={`${styles.noteItem} ${n.author_role === 'client' ? styles.clientNote : ''}`} key={n.id}>
              <div className={styles.noteFrom}>{n.author_name}</div>
              <div className={styles.noteText}>{n.body}</div>
              <div className={styles.noteTime}>{formatDate(n.created_at)}</div>
            </div>
          ))}
          {(!notes || notes.length === 0) && (
            <EmptyState icon="ti-note" title="No notes yet" subtitle="Updates on this project will appear here." />
          )}
        </div>
        <NewNoteForm projectId={projectId} />
      </div>
    </div>
  );
}
