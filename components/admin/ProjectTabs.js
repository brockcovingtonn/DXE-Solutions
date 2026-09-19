'use client';

import { useState } from 'react';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import WeekStripCalendar from '@/components/WeekStripCalendar';
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

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'team', label: 'Team' },
  { key: 'scope', label: 'Scope & Schedule' },
  { key: 'documents', label: 'Documents & Proposals' },
  { key: 'financials', label: 'Financials' },
  { key: 'media', label: 'Media' },
];

export default function ProjectTabs({
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
  const [tab, setTab] = useState('overview');

  const latestUpdates = buildNotesTimeline(notes, proposalActivity).slice(0, 3);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className={styles.fullWidthCard} style={{ margin: 0 }}>
          <h3>Project at a glance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
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
          <h3>This week</h3>
          <WeekStripCalendar events={calendarEvents || []} />
        </div>

        <div className={styles.fullWidthCard} style={{ margin: 0 }}>
          <h3>Latest updates</h3>
          {latestUpdates.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Nothing yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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

      <div className={adminStyles.subTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${adminStyles.subTab} ${tab === t.key ? adminStyles.subTabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
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
        </>
      )}

      {tab === 'team' && (
        <>
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
        </>
      )}

      {tab === 'scope' && (
        <>
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
        </>
      )}

      {tab === 'documents' && (
        <>
          <div className={styles.fullWidthCard}>
            <h3>Documents</h3>
            <AdminDocuments projectId={projectId} initialDocs={docs || []} />
          </div>
          <div className={styles.fullWidthCard}>
            <h3>Proposals</h3>
            <ProjectProposalsList projectId={projectId} proposals={proposals || []} />
          </div>
        </>
      )}

      {tab === 'financials' && (
        <div className={styles.fullWidthCard} id="accounting">
          <h3>Accounting</h3>
          <AccountingEditor projectId={projectId} initialInvoices={invoices || []} />

          <h4
            style={{
              fontSize: '0.82rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              margin: '1.5rem 0 0.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(var(--border-rgb),0.08)',
            }}
          >
            Payment Schedule
          </h4>
          <PaymentScheduleEditor projectId={projectId} initialItems={paymentSchedule || []} />
        </div>
      )}

      {tab === 'media' && (
        <>
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
        </>
      )}

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
