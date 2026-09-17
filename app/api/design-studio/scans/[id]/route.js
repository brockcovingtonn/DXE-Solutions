import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';
const URL_TTL = 3600;

async function signScan(db, scan) {
  const { projects, ...rest } = scan;
  const [{ data: model }, { data: floorPlan }, { data: modelGltf }, { data: annotatedPdf }] = await Promise.all([
    db.storage.from(BUCKET).createSignedUrl(scan.model_path, URL_TTL),
    scan.floor_plan_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.floor_plan_path, URL_TTL)
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
    model_gltf_url: modelGltf?.signedUrl || null,
    annotated_pdf_url: annotatedPdf?.signedUrl || null,
  };
}

export async function GET(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();
    const { data, error } = await db.from('design_studio_room_scans').select('*, projects(name)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) {
      const e = new Error('Scan not found');
      e.status = 404;
      throw e;
    }
    return Response.json({ scan: await signScan(db, data) });
  } catch (err) {
    return jsonError(err);
  }
}

// Attaches a scan captured before the quote existed — the builder scans a
// room first, then attaches once the quote it belongs to has been saved.
export async function PATCH(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const body = await request.json();
    const db = supabaseAdmin();

    const patch = {};
    if (body.quoteId !== undefined) patch.quote_id = body.quoteId;
    if (body.roomLabel !== undefined) patch.room_label = body.roomLabel;
    if (body.showToClient !== undefined) patch.show_to_client = Boolean(body.showToClient);
    if (body.projectId !== undefined) patch.project_id = body.projectId;
    if (body.elements !== undefined) patch.elements = Array.isArray(body.elements) ? body.elements : [];
    if (body.objects !== undefined) patch.objects = Array.isArray(body.objects) ? body.objects : [];
    if (body.hasAnnotatedPdf !== undefined) patch.annotated_pdf_path = body.hasAnnotatedPdf ? `${id}/annotated.pdf` : null;

    const { data, error } = await db
      .from('design_studio_room_scans')
      .update(patch)
      .eq('id', id)
      .select('*, projects(name)')
      .single();
    if (error) throw error;

    return Response.json({ scan: await signScan(db, data) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: scan } = await db.from('design_studio_room_scans').select('model_path, floor_plan_path, model_gltf_path, annotated_pdf_path').eq('id', id).maybeSingle();
    if (scan) {
      await db.storage.from(BUCKET).remove([scan.model_path, scan.floor_plan_path, scan.model_gltf_path, scan.annotated_pdf_path].filter(Boolean));
    }
    const { error } = await db.from('design_studio_room_scans').delete().eq('id', id);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
