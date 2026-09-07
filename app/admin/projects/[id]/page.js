import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import ProjectInfoForm from '@/components/admin/ProjectInfoForm';
import ProjectEmployeesForm from '@/components/admin/ProjectEmployeesForm';
import PermitsEditor from '@/components/admin/PermitsEditor';
import AccountingEditor from '@/components/admin/AccountingEditor';
import ProjectTeamEditor from '@/components/admin/ProjectTeamEditor';
import PhasesEditor from '@/components/admin/PhasesEditor';
import ActionItemsEditor from '@/components/admin/ActionItemsEditor';
import MilestonesEditor from '@/components/admin/MilestonesEditor';
import AdminUtilitiesEditor from '@/components/admin/AdminUtilitiesEditor';
import AdminDocuments from '@/components/admin/AdminDocuments';
import AdminPhotos from '@/components/admin/AdminPhotos';
import AdminNotes from '@/components/admin/AdminNotes';
import ProjectCalendarEditor from '@/components/admin/ProjectCalendarEditor';

export default async function AdminProjectPage({ params }) {
  const supabase = createClient();
  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const [{ data: phases }, { data: milestones }, { data: docs }, { data: photos }, { data: notes }, { data: team }, { data: utilities }, { data: actionItems }, { data: assignablePeople }, { data: permits }, { data: invoices }, { data: allEmployees }, { data: employeeAssignments }, { data: calendarEvents }] =
    await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('photos').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_team').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.rpc('get_project_utilities_admin', { p_project_id: projectId }),
      supabase.from('action_items').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').or('is_admin.eq.true,is_employee.eq.true').order('first_name'),
      supabase.from('permits').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('invoices').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').eq('is_employee', true).order('first_name'),
      supabase.from('project_employees').select('employee_id').eq('project_id', projectId),
      supabase.from('calendar_events').select('*').eq('project_id', projectId).order('start_time'),
    ]);

  const assignedEmployeeIds = (employeeAssignments || []).map((a) => a.employee_id);

  // Generate signed URLs for photos so admin can preview them
  let photosWithUrls = [];
  if (photos && photos.length > 0) {
    photosWithUrls = await Promise.all(
      photos.map(async (p) => {
        const { data } = await supabase.storage
          .from('project-photos')
          .createSignedUrl(p.file_path, 3600);
        return { ...p, url: data?.signedUrl };
      })
    );
  }

  const client = project.profiles;

  return (
    <div>
      <Link href="/admin/clients" className={adminStyles.breadcrumb}>
        <i className="ti ti-arrow-left" aria-hidden="true"></i> Back to clients
      </Link>
      <div className={styles.portalHeader}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>{project.name}</h1>
            <p>
              {client?.first_name} {client?.last_name} ({client?.email})
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href={`/projects/${projectId}/cover-sheet`}
              className={adminStyles.viewAsClientLink}
              target="_blank"
            >
              <i className="ti ti-file-description" aria-hidden="true"></i> Cover sheet
            </Link>
            <Link
              href={`/portal/projects/${projectId}/overview`}
              className={adminStyles.viewAsClientLink}
              target="_blank"
            >
              <i className="ti ti-eye" aria-hidden="true"></i> View as client
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project details</h3>
        <ProjectInfoForm project={project} />

        <h3
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.1rem',
            margin: '1.5rem 0 1rem',
            color: 'var(--navy)',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(62,84,104,0.08)',
          }}
        >
          Assigned employees
        </h3>
        <ProjectEmployeesForm
          projectId={projectId}
          allEmployees={allEmployees || []}
          assignedEmployeeIds={assignedEmployeeIds}
        />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Permits</h3>
        <PermitsEditor projectId={projectId} initialPermits={permits || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project team</h3>
        <ProjectTeamEditor projectId={projectId} initialTeam={team || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Project phases</h3>
        <PhasesEditor projectId={projectId} initialPhases={phases || []} />
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
        <h3>Calendar</h3>
        <ProjectCalendarEditor
          projectId={projectId}
          initialEvents={calendarEvents || []}
          people={assignablePeople || []}
        />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Milestones</h3>
        <MilestonesEditor projectId={projectId} initialMilestones={milestones || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Utilities</h3>
        <AdminUtilitiesEditor projectId={projectId} initialUtilities={utilities || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Documents</h3>
        <AdminDocuments projectId={projectId} initialDocs={docs || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Accounting</h3>
        <AccountingEditor projectId={projectId} initialInvoices={invoices || []} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Photos</h3>
        <AdminPhotos projectId={projectId} initialPhotos={photosWithUrls} />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Notes &amp; updates</h3>
        <AdminNotes projectId={projectId} initialNotes={notes || []} />
      </div>
    </div>
  );
}
