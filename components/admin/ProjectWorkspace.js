'use client';

import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import MiniMonthCalendar from '@/components/MiniMonthCalendar';
import ProjectInfoForm from '@/components/admin/ProjectInfoForm';
import ProjectEmployeesForm from '@/components/admin/ProjectEmployeesForm';
import ScanManager from '@/components/design-studio/ScanManager';
import PermitsEditor from '@/components/admin/PermitsEditor';
import AccountingEditor from '@/components/admin/AccountingEditor';
import ProjectTeamEditor from '@/components/admin/ProjectTeamEditor';
import InterestedPartiesEditor from '@/components/admin/InterestedPartiesEditor';
import PhasesEditor from '@/components/admin/PhasesEditor';
import ActionItemsEditor from '@/components/admin/ActionItemsEditor';
import MilestonesEditor from '@/components/admin/MilestonesEditor';
import AdminUtilitiesEditor from '@/components/admin/AdminUtilitiesEditor';
import AdminDocuments from '@/components/admin/AdminDocuments';
import AdminPhotos from '@/components/admin/AdminPhotos';
import AdminNotes, { buildNotesTimeline } from '@/components/admin/AdminNotes';
import ProjectCalendarEditor from '@/components/admin/ProjectCalendarEditor';
import DangerDeleteButton from '@/components/admin/DangerDeleteButton';
import ProjectProposalsList from '@/components/admin/ProjectProposalsList';
import PaymentScheduleEditor from '@/components/admin/PaymentScheduleEditor';

const STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  'on-hold': 'On hold',
  completed: 'Completed',
};

const TOC = [
  { key: 'overview', label: 'Overview' },
  { key: 'team', label: 'Team' },
  { key: 'scope', label: 'Scope & Schedule' },
  { key: 'documents', label: 'Documents & Proposals' },
  { key: 'financials', label: 'Financials' },
  { key: 'media', label: 'Media' },
];

export default function ProjectWorkspace({
  project,
  projectId,
  isMaster,
  phases,
  milestones,
  docs,
  photosWithUrls,
  notes,
  proposalActivity,
  team,
  interestedParties,
  utilities,
  actionItems,
  assignablePeople,
  permits,
  invoices,
  allEmployees,
  assignedEmployeeIds,
  calendarEvents,
  contacts,
  proposals,
  paymentSchedule,
  roomScansWithUrls,
}) {
  const latestUpdates = buildNotesTimeline(notes, proposalActivity).slice(0, 3);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className={styles.fullWidthCard} style={{ margin: 0 }}>
          <h3>Project at a glance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Status: </span>
              <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{STATUS_LABELS[project.status] || project.status || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Type: </span>
              <span style={{ color: 'var(--navy)' }}>{project.project_type || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Address: </span>
              <span style={{ color: 'var(--navy)' }}>{project.address || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Progress: </span>
              <span style={{ color: 'var(--navy)' }}>{project.progress_pct ?? 0}%</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Room scanner: </span>
              <span style={{ color: 'var(--navy)' }}>{project.room_scanner_enabled ? 'Enabled for client' : 'Off'}</span>
            </div>
          </div>
        </div>

        <div className={styles.fullWidthCard} style={{ margin: 0 }}>
          <MiniMonthCalendar events={calendarEvents || []} />
        </div>

        <div className={styles.fullWidthCard} style={{ margin: 0 }}>
          <h3>Latest updates</h3>
          {latestUpdates.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Nothing yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {latestUpdates.map((item) => {
                const at = item.kind === 'activity' ? item.activity.created_at : item.note.created_at;
                const text = item.kind === 'activity' ? item.activity.text : item.note.body;
                const key = item.kind === 'activity' ? `activity-${item.activity.id}` : `note-${item.note.id}`;
                return (
                  <div key={key}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--navy)' }}>{text}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                      {new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(var(--border-rgb),0.1)',
        }}
      >
        {TOC.map((t) => (
          <a key={t.key} href={`#section-${t.key}`} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {t.label}
          </a>
        ))}
      </div>

      <h2 id="section-overview" className={adminStyles.fieldDivider} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        Overview
      </h2>
      <div className={styles.fullWidthCard}>
        <h3>Project details</h3>
        <ProjectInfoForm project={project} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Calendar</h3>
        <ProjectCalendarEditor
          projectId={projectId}
          initialEvents={calendarEvents || []}
          people={assignablePeople || []}
          contacts={contacts || []}
        />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Notes &amp; updates</h3>
        <AdminNotes projectId={projectId} initialNotes={notes || []} proposalActivity={proposalActivity || []} />
      </div>

      <h2 id="section-team" className={adminStyles.fieldDivider}>
        Team
      </h2>
      <div className={styles.fullWidthCard}>
        <h3>Assigned employees</h3>
        <ProjectEmployeesForm
          projectId={projectId}
          allEmployees={allEmployees || []}
          assignedEmployeeIds={assignedEmployeeIds}
        />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Project team</h3>
        <ProjectTeamEditor projectId={projectId} initialTeam={team || []} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Interested parties</h3>
        <InterestedPartiesEditor projectId={projectId} initialParties={interestedParties || []} />
      </div>

      <h2 id="section-scope" className={adminStyles.fieldDivider}>
        Scope &amp; Schedule
      </h2>
      <div className={styles.fullWidthCard}>
        <h3>Project phases</h3>
        <PhasesEditor projectId={projectId} initialPhases={phases || []} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Milestones</h3>
        <MilestonesEditor projectId={projectId} initialMilestones={milestones || []} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Action items</h3>
        <ActionItemsEditor
          projectId={projectId}
          initialItems={actionItems || []}
          assignablePeople={assignablePeople || []}
        />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Permits</h3>
        <PermitsEditor projectId={projectId} initialPermits={permits || []} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Utilities</h3>
        <AdminUtilitiesEditor projectId={projectId} initialUtilities={utilities || []} />
      </div>

      <h2 id="section-documents" className={adminStyles.fieldDivider}>
        Documents &amp; Proposals
      </h2>
      <div className={styles.fullWidthCard}>
        <h3>Documents</h3>
        <AdminDocuments projectId={projectId} initialDocs={docs || []} />
      </div>
      <div className={styles.fullWidthCard}>
        <h3>Proposals</h3>
        <ProjectProposalsList projectId={projectId} proposals={proposals || []} />
      </div>

      <h2 id="section-financials" className={adminStyles.fieldDivider}>
        Financials
      </h2>
      <div className={styles.fullWidthCard} id="accounting">
        <h3>Accounting</h3>
        <AccountingEditor projectId={projectId} initialInvoices={invoices || []} />
        <h4
          style={{
            fontSize: '0.82rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
            margin: '1rem 0 0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(var(--border-rgb),0.08)',
          }}
        >
          Payment Schedule
        </h4>
        <PaymentScheduleEditor projectId={projectId} initialItems={paymentSchedule || []} />
      </div>

      <h2 id="section-media" className={adminStyles.fieldDivider}>
        Media
      </h2>
      <div className={styles.fullWidthCard}>
        <h3>Photos</h3>
        <AdminPhotos projectId={projectId} initialPhotos={photosWithUrls} />
      </div>
      {roomScansWithUrls.length > 0 ? (
        <div className={styles.fullWidthCard}>
          <h3>Room scans</h3>
          <ScanManager scans={roomScansWithUrls} isMaster={isMaster} />
        </div>
      ) : null}

      <DangerDeleteButton
        heading="Delete this project"
        description="Permanently removes this project and everything attached to it — documents, permits, notes, photos, invoices, and calendar events. This cannot be undone."
        buttonText="Delete project"
        endpoint={`/api/admin/projects/${projectId}`}
        redirectTo="/admin/projects"
      />
    </div>
  );
}
