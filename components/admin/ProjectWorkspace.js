'use client';

import { useState } from 'react';
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
import Link from 'next/link';
import PaymentScheduleEditor from '@/components/admin/PaymentScheduleEditor';

import ProjectDetailsView from '@/components/admin/views/ProjectDetailsView';
import AssignedEmployeesView from '@/components/admin/views/AssignedEmployeesView';
import RosterListView from '@/components/admin/views/RosterListView';
import PhasesView from '@/components/admin/views/PhasesView';
import MilestonesView from '@/components/admin/views/MilestonesView';
import ActionItemsView from '@/components/admin/views/ActionItemsView';
import PermitsView from '@/components/admin/views/PermitsView';
import UtilitiesSummaryView from '@/components/admin/views/UtilitiesSummaryView';

const DS_STATUS_STYLE = {
  draft: { background: 'rgba(201,168,87,0.15)', color: '#7a5c0a' },
  sent: { background: 'rgba(62,84,104,0.12)', color: 'var(--navy)' },
  accepted: { background: 'rgba(16,185,129,0.12)', color: 'var(--text-success)' },
  declined: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
  expired: { background: 'rgba(148,163,184,0.15)', color: 'var(--text-tertiary)' },
};

const TABS = [
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
  activity,
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
  designStudioQuotes,
}) {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div>
      <div className={adminStyles.subTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${adminStyles.subTab} ${selectedTab === t.key ? adminStyles.subTabActive : ''}`}
            onClick={() => setSelectedTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selectedTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
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
            edit={<AdminNotes projectId={projectId} initialNotes={[]} activity={[]} hideList />}
            view={<AdminNotes projectId={projectId} initialNotes={notes || []} activity={activity || []} hideForm />}
          />
        </>
      )}

      {selectedTab === 'team' && (
        <>
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
        </>
      )}

      {selectedTab === 'scope' && (
        <>
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
        </>
      )}

      {selectedTab === 'documents' && (
        <>
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
          {designStudioQuotes && designStudioQuotes.length > 0 && (
            <div className={styles.fullWidthCard}>
              <h3>Design Studio Quotes</h3>
              {designStudioQuotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/design-studio/${q.id}`}
                  className={adminStyles.listRow}
                  style={{ textDecoration: 'none' }}
                >
                  <span className={adminStyles.listRowPill} style={DS_STATUS_STYLE[q.status] || DS_STATUS_STYLE.draft}>
                    {q.status}
                  </span>
                  <div className={adminStyles.listRowMain}>
                    <div className={adminStyles.listRowTitle}>{q.quote_number}</div>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--navy)', flexShrink: 0 }}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(q.total || 0)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {selectedTab === 'financials' && (
        <>
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
        </>
      )}

      {selectedTab === 'media' && (
        <>
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
