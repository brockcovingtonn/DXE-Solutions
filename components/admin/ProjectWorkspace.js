'use client';

import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
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
import ScopeOfWorkEditor from '@/components/ScopeOfWorkEditor';
import AdminDocuments from '@/components/admin/AdminDocuments';
import AdminPhotos from '@/components/admin/AdminPhotos';
import AdminNotes from '@/components/admin/AdminNotes';
import ProjectCalendarEditor from '@/components/admin/ProjectCalendarEditor';
import DangerDeleteButton from '@/components/admin/DangerDeleteButton';
import ProjectProposalsList from '@/components/admin/ProjectProposalsList';
import PaymentScheduleEditor from '@/components/admin/PaymentScheduleEditor';

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
  scopeAreas,
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem',
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
      <div className={styles.fullWidthCard}>
        <h3>Scope of Work</h3>
        <ScopeOfWorkEditor projectId={projectId} areas={scopeAreas || []} isAdmin />
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
