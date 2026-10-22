'use client';

import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ViewEditSection from '@/components/ViewEditSection';
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

import ProjectDetailsView from '@/components/admin/views/ProjectDetailsView';
import AssignedEmployeesView from '@/components/admin/views/AssignedEmployeesView';
import RosterListView from '@/components/admin/views/RosterListView';
import PhasesView from '@/components/admin/views/PhasesView';
import MilestonesView from '@/components/admin/views/MilestonesView';
import ActionItemsView from '@/components/admin/views/ActionItemsView';
import PermitsView from '@/components/admin/views/PermitsView';
import UtilitiesSummaryView from '@/components/admin/views/UtilitiesSummaryView';

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
        <ViewEditSection
          title="Project details"
          view={<ProjectDetailsView project={project} />}
          edit={<ProjectInfoForm project={project} />}
        />
        {/* Calendar stays as-is — it's already a compact, interactive widget, and adding an event already opens its own popup. */}
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
      <ViewEditSection
        title="Notes & updates"
        actionLabel="Add"
        edit={<AdminNotes projectId={projectId} initialNotes={[]} proposalActivity={[]} hideList />}
        view={<AdminNotes projectId={projectId} initialNotes={notes || []} proposalActivity={proposalActivity || []} hideForm />}
      />

      <h2 id="section-team" className={adminStyles.fieldDivider}>
        Team
      </h2>
      <ViewEditSection
        title="Assigned employees"
        view={<AssignedEmployeesView allEmployees={allEmployees || []} assignedEmployeeIds={assignedEmployeeIds} />}
        edit={
          <ProjectEmployeesForm
            projectId={projectId}
            allEmployees={allEmployees || []}
            assignedEmployeeIds={assignedEmployeeIds}
          />
        }
      />
      <ViewEditSection
        title="Project team"
        actionLabel={(team || []).length === 0 ? 'Add' : 'Edit'}
        view={<RosterListView items={team || []} tagField="trade" emptyLabel="No team members added yet." />}
        edit={<ProjectTeamEditor projectId={projectId} initialTeam={team || []} />}
      />
      <ViewEditSection
        title="Interested parties"
        actionLabel={(interestedParties || []).length === 0 ? 'Add' : 'Edit'}
        view={<RosterListView items={interestedParties || []} tagField="relationship" emptyLabel="No interested parties added yet." />}
        edit={<InterestedPartiesEditor projectId={projectId} initialParties={interestedParties || []} />}
      />

      <h2 id="section-scope" className={adminStyles.fieldDivider}>
        Scope &amp; Schedule
      </h2>
      <ViewEditSection
        title="Project phases"
        actionLabel={(phases || []).length === 0 ? 'Add' : 'Edit'}
        view={<PhasesView phases={phases || []} />}
        edit={<PhasesEditor projectId={projectId} initialPhases={phases || []} />}
      />
      <ViewEditSection
        title="Milestones"
        actionLabel={(milestones || []).length === 0 ? 'Add' : 'Edit'}
        view={<MilestonesView milestones={milestones || []} />}
        edit={<MilestonesEditor projectId={projectId} initialMilestones={milestones || []} />}
      />
      <ViewEditSection
        title="Action items"
        actionLabel={(actionItems || []).length === 0 ? 'Add' : 'Edit'}
        view={<ActionItemsView items={actionItems || []} />}
        edit={
          <ActionItemsEditor
            projectId={projectId}
            initialItems={actionItems || []}
            assignablePeople={assignablePeople || []}
          />
        }
      />
      <ViewEditSection
        title="Permits"
        actionLabel={(permits || []).length === 0 ? 'Add' : 'Edit'}
        view={<PermitsView permits={permits || []} />}
        edit={<PermitsEditor projectId={projectId} initialPermits={permits || []} />}
      />
      <ViewEditSection
        title="Utilities"
        view={<UtilitiesSummaryView utilities={utilities || []} />}
        edit={<AdminUtilitiesEditor projectId={projectId} initialUtilities={utilities || []} />}
      />
      {/* Scope of Work keeps its checkboxes always visible and clickable — it has its own internal Edit toggle for the add/delete/notes chrome, not a popup. */}
      <div className={styles.fullWidthCard}>
        <h3>Scope of Work</h3>
        <ScopeOfWorkEditor projectId={projectId} areas={scopeAreas || []} isAdmin />
      </div>

      <h2 id="section-documents" className={adminStyles.fieldDivider}>
        Documents &amp; Proposals
      </h2>
      <ViewEditSection
        title="Documents"
        actionLabel="Add"
        edit={<AdminDocuments projectId={projectId} initialDocs={[]} hideList />}
        view={<AdminDocuments projectId={projectId} initialDocs={docs || []} hideForm />}
      />
      {/* Proposals stays as-is — already a compact list with a "Create a Proposal" button that navigates to its own page. */}
      <div className={styles.fullWidthCard}>
        <h3>Proposals</h3>
        <ProjectProposalsList projectId={projectId} proposals={proposals || []} />
      </div>

      <h2 id="section-financials" className={adminStyles.fieldDivider}>
        Financials
      </h2>
      <ViewEditSection
        title="Accounting"
        actionLabel="Add entry"
        edit={<AccountingEditor projectId={projectId} initialInvoices={[]} hideList />}
        view={<AccountingEditor projectId={projectId} initialInvoices={invoices || []} hideForm />}
      />
      <ViewEditSection
        title="Payment Schedule"
        actionLabel="Add milestone"
        edit={<PaymentScheduleEditor projectId={projectId} initialItems={[]} hideList startAdding />}
        view={<PaymentScheduleEditor projectId={projectId} initialItems={paymentSchedule || []} hideForm />}
      />

      <h2 id="section-media" className={adminStyles.fieldDivider}>
        Media
      </h2>
      <ViewEditSection
        title="Photos"
        actionLabel="Add"
        edit={<AdminPhotos projectId={projectId} initialPhotos={[]} hideList />}
        view={<AdminPhotos projectId={projectId} initialPhotos={photosWithUrls} hideForm />}
      />
      {/* Room Scans stays as-is — already a compact grid with its own internal viewers/pickers. */}
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
