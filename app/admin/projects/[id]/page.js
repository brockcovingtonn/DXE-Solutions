import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import adminStyles from '@/components/admin.module.css';
import { supabaseAdmin as designStudioAdmin } from '@/lib/design-studio/server';
import ProjectTabs from '@/components/admin/ProjectTabs';

export default async function AdminProjectPage({ params }) {
  const supabase = createClient();
  const projectId = params.id;

  const { data: project } = await supabase
    .from('projects')
    .select('*, profiles!projects_owner_id_fkey(first_name, last_name, email)')
    .eq('id', projectId)
    .single();

  if (!project) notFound();

  const [{ data: phases }, { data: milestones }, { data: docs }, { data: photos }, { data: notes }, { data: proposalActivity }, { data: team }, { data: interestedParties }, { data: utilities }, { data: actionItems }, { data: assignablePeople }, { data: permits }, { data: invoices }, { data: allEmployees }, { data: employeeAssignments }, { data: calendarEvents }, { data: contacts }] =
    await Promise.all([
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('documents').select('*, document_signatures(signer_name, created_at)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('photos').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('activity').select('*').eq('project_id', projectId).eq('type', 'proposal').order('created_at', { ascending: false }),
      supabase.from('project_team').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_interested_parties').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.rpc('get_project_utilities_admin', { p_project_id: projectId }),
      supabase.from('action_items').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').or('is_admin.eq.true,is_employee.eq.true').order('first_name'),
      supabase.from('permits').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('invoices').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').eq('is_employee', true).order('first_name'),
      supabase.from('project_employees').select('employee_id').eq('project_id', projectId),
      supabase.from('calendar_events').select('*, calendar_event_guests(email, name), calendar_event_contacts(contact_id)').eq('project_id', projectId).order('start_time'),
      supabase.from('contacts').select('*').order('name'),
    ]);

  const { data: proposals } = await supabase
    .from('proposals')
    .select('*, proposal_signatures(signer_name, created_at), proposal_declines(reason, created_at)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const { data: paymentSchedule } = await supabase
    .from('payment_schedule_items')
    .select('*')
    .eq('project_id', projectId)
    .order('due_date');

  // RLS-scoped on purpose (not service-role) — the new employee/client
  // policies on design_studio_room_scans decide what comes back here for
  // free: admins see everything, employees only if assigned to this
  // project via project_employees. Storage has no client-facing policies
  // on this bucket though, so signed URLs still need the service-role
  // client below, applied only to rows RLS has already allowed through.
  const { data: roomScans } = await supabase
    .from('design_studio_room_scans')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const { data: currentProfile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser?.id).maybeSingle();
  const isMaster = Boolean(currentProfile?.is_admin);

  let roomScansWithUrls = [];
  if (roomScans && roomScans.length > 0) {
    const scansDb = designStudioAdmin();
    roomScansWithUrls = await Promise.all(
      roomScans.map(async (scan) => {
        const [{ data: model }, { data: floorPlan }, { data: modelGltf }] = await Promise.all([
          scansDb.storage.from('design-studio-scans').createSignedUrl(scan.model_path, 3600),
          scan.floor_plan_path
            ? scansDb.storage.from('design-studio-scans').createSignedUrl(scan.floor_plan_path, 3600)
            : Promise.resolve({ data: null }),
          scan.model_gltf_path
            ? scansDb.storage.from('design-studio-scans').createSignedUrl(scan.model_gltf_path, 3600)
            : Promise.resolve({ data: null }),
        ]);
        return {
          id: scan.id,
          roomLabel: scan.room_label,
          areaSqft: scan.area_sqft,
          areaIsEstimate: scan.area_is_estimate,
          wallCount: scan.wall_count,
          doorCount: scan.door_count,
          windowCount: scan.window_count,
          modelUrl: model?.signedUrl || null,
          floorPlanUrl: floorPlan?.signedUrl || null,
          modelGltfUrl: modelGltf?.signedUrl || null,
          elements: scan.elements || [],
          objects: scan.objects || [],
          showToClient: scan.show_to_client,
          project: { id: projectId, name: project.name },
        };
      })
    );
  }

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
            <Link href={`/admin/projects/${projectId}/proposals/new`} className="btn-navy">
              <i className="ti ti-file-invoice" aria-hidden="true" style={{ marginRight: '0.4rem' }}></i> Create A Proposal
            </Link>
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

      <ProjectTabs
        project={project}
        projectId={projectId}
        isMaster={isMaster}
        phases={phases}
        milestones={milestones}
        docs={docs}
        photosWithUrls={photosWithUrls}
        notes={notes}
        proposalActivity={proposalActivity}
        team={team}
        interestedParties={interestedParties}
        utilities={utilities}
        actionItems={actionItems}
        assignablePeople={assignablePeople}
        permits={permits}
        invoices={invoices}
        allEmployees={allEmployees}
        assignedEmployeeIds={assignedEmployeeIds}
        calendarEvents={calendarEvents}
        contacts={contacts}
        proposals={proposals}
        paymentSchedule={paymentSchedule}
        roomScansWithUrls={roomScansWithUrls}
      />
    </div>
  );
}
