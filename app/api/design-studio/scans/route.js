import { requireStaff, requireStaffOrScanningClient, getStaffUser, supabaseAdmin, jsonError } from '@/lib/design-studio/server';
import { getRequestClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';
const URL_TTL = 3600;

async function signScan(db, scan) {
  const { projects, ...rest } = scan;
  const [{ data: model }, { data: floorPlan }, { data: floorPlanDownload }, { data: modelGltf }, { data: annotatedPdf }] = await Promise.all([
    db.storage.from(BUCKET).createSignedUrl(scan.model_path, URL_TTL),
    scan.floor_plan_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.floor_plan_path, URL_TTL)
      : Promise.resolve({ data: null }),
    // Only the 2D floor plan is downloadable — a separate signed URL with
    // Content-Disposition: attachment, since a plain <a download> doesn't
    // force a download for a cross-origin (Supabase Storage) link.
    scan.floor_plan_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.floor_plan_path, URL_TTL, { download: true })
      : Promise.resolve({ data: null }),
    scan.model_gltf_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.model_gltf_path, URL_TTL)
      : Promise.resolve({ data: null }),
    scan.annotated_pdf_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.annotated_pdf_path, URL_TTL, { download: true })
      : Promise.resolve({ data: null }),
  ]);
  return {
    ...rest,
    project_name: projects?.name || null,
    model_url: model?.signedUrl || null,
    floor_plan_url: floorPlan?.signedUrl || null,
    floor_plan_download_url: floorPlanDownload?.signedUrl || null,
    model_gltf_url: modelGltf?.signedUrl || null,
    annotated_pdf_url: annotatedPdf?.signedUrl || null,
  };
}

// Registers a scan after the native app has already uploaded its model +
// floor plan straight to Storage via the signed URLs from upload-url.
export async function POST(request) {
  try {
    const body = await request.json();
    const user = await requireStaffOrScanningClient(request, body.projectId);
    if (!body.scanId) {
      const e = new Error('scanId is required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('design_studio_room_scans')
      .insert({
        id: body.scanId,
        quote_id: body.quoteId || null,
        project_id: body.projectId || null,
        room_label: body.roomLabel || null,
        show_to_client: Boolean(body.showToClient),
        area_sqft: body.areaSqft != null ? Number(body.areaSqft) : null,
        area_is_estimate: Boolean(body.areaIsEstimate),
        wall_count: Number(body.wallCount) || 0,
        door_count: Number(body.doorCount) || 0,
        window_count: Number(body.windowCount) || 0,
        elements: Array.isArray(body.elements) ? body.elements : [],
        objects: Array.isArray(body.objects) ? body.objects : [],
        model_path: `${body.scanId}/model.usdz`,
        floor_plan_path: `${body.scanId}/floor-plan.png`,
        model_gltf_path: body.hasGltf ? `${body.scanId}/model.glb` : null,
        created_by: user.id,
        created_by_name: user.name,
      })
      .select('*, projects(name)')
      .single();
    if (error) throw error;

    const signed = await signScan(db, data);
    return Response.json({ scan: signed }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

// Scans attached to a quote or a project — the quote detail page's "room
// scan" panel, the project detail page's equivalent, and (project-scoped
// only) the client's own scan history.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');
    const projectId = searchParams.get('projectId');
    if (!quoteId && !projectId) {
      const e = new Error('quoteId or projectId is required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();

    if (quoteId) {
      // Unchanged: quote-scoped scans stay staff-only, exactly as before —
      // this is the original Design Studio flow, no client ever reaches it.
      await requireStaff(request);
    } else {
      // Project-scoped: master admins see everything; employees only if
      // assigned to the project (project_employees); a client only their
      // own project's scans, regardless of whether room_scanner_enabled is
      // currently on — turning capture off shouldn't hide past scans.
      const staffUser = await getStaffUser(request);
      if (staffUser) {
        if (!staffUser.isMaster) {
          const { data: assignment } = await db
            .from('project_employees')
            .select('project_id')
            .eq('project_id', projectId)
            .eq('employee_id', staffUser.id)
            .maybeSingle();
          if (!assignment) {
            const e = new Error('Not authorised');
            e.status = 403;
            throw e;
          }
        }
      } else {
        const { user } = await getRequestClient(request);
        if (!user) {
          const e = new Error('Not authorised');
          e.status = 403;
          throw e;
        }
        const { data: project } = await db.from('projects').select('owner_id').eq('id', projectId).maybeSingle();
        if (!project || project.owner_id !== user.id) {
          const e = new Error('Not authorised');
          e.status = 403;
          throw e;
        }
      }
    }

    let query = db.from('design_studio_room_scans').select('*, projects(name)').order('created_at', { ascending: false });
    query = quoteId ? query.eq('quote_id', quoteId) : query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;

    const scans = await Promise.all((data || []).map((scan) => signScan(db, scan)));
    return Response.json({ scans });
  } catch (err) {
    return jsonError(err);
  }
}
