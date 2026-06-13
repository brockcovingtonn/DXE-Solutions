import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';

export default async function ProjectOverviewPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single();

  if (!project) notFound();

  const [{ data: phases }, { data: milestones }, { data: docs }, { data: activity }, { data: notes }] =
    await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('activity').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
      supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1),
    ]);

  const doneMilestones = (milestones || []).filter((m) => m.state === 'done').length;
  const totalMilestones = (milestones || []).length;
  const recentDocs = (docs || []).slice(0, 4);

  const ICONS = {
    note: 'ti-notes',
    doc: 'ti-file',
    status: 'ti-check',
    photo: 'ti-photo',
  };

  const ICON_CLASS = {
    note: styles.actIconNote,
    doc: styles.actIconDoc,
    status: styles.actIconStatus,
    photo: styles.actIconPhoto,
  };

  const BADGE_CLASS = {
    new: styles.badgeNew,
    signed: styles.badgeSigned,
    pending: styles.badgePending,
  };

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>{project.name}</h1>
        <p>
          {project.project_type} · {project.estimated_value} · PM: {project.pm_name}
        </p>
      </div>

      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Overall Progress</div>
          <div className={styles.scValue}>{project.progress_pct}%</div>
          <div className={styles.scSub}>of project complete</div>
          <div className={styles.scBar}>
            <div className={styles.scBarFill} style={{ width: `${project.progress_pct}%` }} />
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Documents</div>
          <div className={styles.scValue}>{docs?.length || 0}</div>
          <div className={styles.scSub}>on file</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Milestones</div>
          <div className={styles.scValue}>
            {doneMilestones}/{totalMilestones}
          </div>
          <div className={styles.scSub}>completed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.scLabel}>Project Start</div>
          <div className={styles.scValueSmall}>{formatDate(project.started_on)}</div>
          <div className={styles.scSub}>Est. complete {formatDate(project.estimated_completion)}</div>
        </div>
      </div>

      <div className={styles.highlightCards}>
        <div className={styles.highlightCard}>
          <div className={styles.hcIcon}>
            <i className="ti ti-user" aria-hidden="true"></i>
          </div>
          <div>
            <div className={styles.hcLabel}>Project Manager</div>
            <div className={styles.hcValue}>{project.pm_name}</div>
          </div>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.hcIcon}>
            <i className="ti ti-calendar" aria-hidden="true"></i>
          </div>
          <div>
            <div className={styles.hcLabel}>Est. Completion</div>
            <div className={styles.hcValue}>{formatDate(project.estimated_completion)}</div>
          </div>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.hcIcon}>
            <i className="ti ti-map-pin" aria-hidden="true"></i>
          </div>
          <div>
            <div className={styles.hcLabel}>Project Address</div>
            <div className={styles.hcValue}>{project.address}</div>
          </div>
        </div>
      </div>

      {phases && phases.length > 0 && (
        <div className={styles.fullWidthCard}>
          <h3>Project Phases</h3>
          <div className={styles.progressPhases}>
            {phases.map((ph) => (
              <div
                key={ph.id}
                className={`${styles.phaseBlock} ${
                  ph.state === 'done'
                    ? styles.phaseBlockDone
                    : ph.state === 'active'
                    ? styles.phaseBlockActive
                    : ''
                }`}
              >
                <div className={styles.phName}>{ph.name}</div>
                <div className={styles.phPct}>{ph.pct}%</div>
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
                </div>
              </div>
            ))}
            {(!milestones || milestones.length === 0) && (
              <p style={{ fontSize: '0.85rem', color: '#718096' }}>No milestones yet.</p>
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
              <p style={{ fontSize: '0.85rem', color: '#718096' }}>No recent activity.</p>
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
              <p style={{ fontSize: '0.85rem', color: '#718096' }}>No documents yet.</p>
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
            <p style={{ fontSize: '0.85rem', color: '#718096' }}>No notes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
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
