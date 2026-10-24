import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import PhaseBar from '@/components/PhaseBar';
import WhatsNextChecklist from '@/components/WhatsNextChecklist';
import MiniMonthCalendar from '@/components/MiniMonthCalendar';

export default async function ProjectOverviewPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, '*');

  if (!project) notFound();

  const [{ data: phases }, { data: milestones }, { data: docs }, { data: activity }, { data: notes }, { data: team }, { data: interestedParties }, { data: utilities }, { data: actionItems }, { data: proposals }, { data: invoices }, { data: calendarEvents }] =
    await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
      supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
      supabase.from('project_team').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_interested_parties').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.rpc('get_project_utilities', { p_project_id: projectId }),
      supabase
        .from('action_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false }),
      // RLS already limits clients to their own non-draft, visible
      // proposals — see WhatsNextChecklist for why this drives the
      // "what's next" card instead of the (admin-only) payment schedule.
      supabase.from('proposals').select('id, status, signed_at').eq('project_id', projectId),
      supabase.from('invoices').select('amount, status, kind').eq('project_id', projectId),
      supabase.from('calendar_events').select('*').eq('project_id', projectId).order('start_time'),
    ]);

  let coverPhotoUrl = null;
  if (project.cover_photo_path) {
    const { data } = await supabase.storage.from('project-photos').createSignedUrl(project.cover_photo_path, 3600);
    coverPhotoUrl = data?.signedUrl || null;
  }

  const recentDocs = (docs || []).slice(0, 4);
  const unpaidInvoices = (invoices || []).filter((i) => i.kind === 'invoice' && i.status === 'unpaid');
  const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  const ICONS = {
    note: 'ti-notes',
    doc: 'ti-file',
    status: 'ti-check',
    photo: 'ti-photo',
    proposal: 'ti-file-invoice',
    scope: 'ti-checklist',
  };

  const ICON_CLASS = {
    note: styles.actIconNote,
    doc: styles.actIconDoc,
    status: styles.actIconStatus,
    photo: styles.actIconPhoto,
    proposal: styles.actIconProposal,
    scope: styles.actIconScope,
  };

  const BADGE_CLASS = {
    new: styles.badgeNew,
    signed: styles.badgeSigned,
    pending: styles.badgePending,
    contract: styles.badgeContract,
  };

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>{project.name}</h1>
        <p>{project.project_type}</p>
      </div>

      <WhatsNextChecklist
        projectId={projectId}
        proposals={proposals}
        unpaidTotal={unpaidTotal}
        unpaidCount={unpaidInvoices.length}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className={styles.fullWidthCard}>
          <h3>Project at a glance</h3>
          {coverPhotoUrl && (
            <img
              src={coverPhotoUrl}
              alt={project.name}
              style={{
                width: '100%',
                height: '180px',
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.85rem',
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Status: </span>
              <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{capitalize(project.status)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Address: </span>
              <span style={{ color: 'var(--navy)' }}>{project.address}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Est. completion: </span>
              <span style={{ color: 'var(--navy)' }}>{formatDate(project.estimated_completion)}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Progress: </span>
              <span style={{ color: 'var(--navy)' }}>{project.progress_pct}%</span>
              <div className={styles.scBar} style={{ marginTop: '0.3rem' }}>
                <div className={styles.scBarFill} style={{ width: `${project.progress_pct}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.fullWidthCard}>
          <MiniMonthCalendar events={calendarEvents || []} viewAllHref={`/portal/projects/${projectId}/calendar`} />
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

      {actionItems && actionItems.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Action Items</h3>
          <div className={styles.statusSteps}>
            {actionItems.map((item) => (
              <div className={styles.statusStep} key={item.id}>
                <div className={`${styles.stepDot} ${item.status === 'done' ? styles.stepDotDone : styles.stepDotPending}`}>
                  {item.status === 'done' ? <i className="ti ti-check" style={{ fontSize: '0.75rem' }}></i> : '·'}
                </div>
                <div>
                  <div className={styles.stepName}>{item.title}</div>
                  {item.description && <div className={styles.stepNotes}>{item.description}</div>}
                  {item.due_date && <div className={styles.stepDate}>Due {item.due_date}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.portalGrid}>
        <div className={styles.portalCard}>
          <h3>Milestones</h3>
          <div className={styles.statusSteps}>
            {(milestones || []).slice(0, 6).map((m) => (
              <div className={styles.statusStep} key={m.id}>
                <div
                  className={`${styles.stepDot} ${
                    m.state === 'done'
                      ? styles.stepDotDone
                      : m.state === 'active'
                      ? styles.stepDotActive
                      : styles.stepDotPending
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
            {(!milestones || milestones.length === 0) && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No milestones yet.</p>
            )}
          </div>
        </div>

        <div className={styles.portalCard}>
          <h3>Recent Activity</h3>
          <div className={styles.activityFeed}>
            {(activity || []).map((a) => (
              <div className={styles.activityItem} key={a.id}>
                <div className={`${styles.actIcon} ${ICON_CLASS[a.type] || ''}`}>
                  <i className={`ti ${ICONS[a.type] || 'ti-info-circle'}`} aria-hidden="true"></i>
                </div>
                <div>
                  <div className={styles.actTitle}>{a.text}</div>
                  <div className={styles.actTime}>{formatRelative(a.created_at)}</div>
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      <div className={styles.portalGrid}>
        <div className={styles.portalCard}>
          <h3>
            Recent Documents
            <a href={`/portal/projects/${projectId}/documents`} className={styles.cardAction}>
              All docs
            </a>
          </h3>
          <div className={styles.docList}>
            {recentDocs.map((d) => (
              <div className={styles.docItem} key={d.id}>
                <div className={styles.docIcon}>
                  <i className="ti ti-file-text" aria-hidden="true"></i>
                </div>
                <div>
                  <div className={styles.docName}>{d.file_name}</div>
                  <div className={styles.docMeta}>
                    {formatDate(d.created_at)} · Uploaded by {d.uploaded_by_role === 'dxe' ? 'DXE' : 'You'}
                  </div>
                </div>
                <span className={`${styles.docBadge} ${BADGE_CLASS[d.badge] || ''}`}>{d.badge}</span>
              </div>
            ))}
            {recentDocs.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No documents yet.</p>
            )}
          </div>
        </div>

        <div className={styles.portalCard}>
          <h3>Latest Update</h3>
          {notes && notes.length > 0 ? (
            <div className={`${styles.noteItem} ${notes[0].author_role === 'client' ? styles.clientNote : ''}`}>
              <div className={styles.noteFrom}>{notes[0].author_name}</div>
              <div className={styles.noteText}>{notes[0].body}</div>
              <div className={styles.noteTime}>{formatDate(notes[0].created_at)}</div>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No notes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // already a display string
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return formatDate(dateStr);
}
