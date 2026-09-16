import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';
const URL_TTL = 3600;

async function signFloorPlan(db, plan) {
  const { projects, ...rest } = plan;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(plan.file_path, URL_TTL, { download: !plan.is_renderable });
  return { ...rest, project_name: projects?.name || null, file_url: data?.signedUrl || null };
}

export async function PATCH(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const body = await request.json();
    const db = supabaseAdmin();

    const patch = {};
    if (body.quoteId !== undefined) patch.quote_id = body.quoteId;
    if (body.showToClient !== undefined) patch.show_to_client = Boolean(body.showToClient);
    if (body.projectId !== undefined) patch.project_id = body.projectId;

    const { data, error } = await db
      .from('design_studio_floor_plans')
      .update(patch)
      .eq('id', id)
      .select('*, projects(name)')
      .single();
    if (error) throw error;

    return Response.json({ floorPlan: await signFloorPlan(db, data) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: plan } = await db.from('design_studio_floor_plans').select('file_path').eq('id', id).maybeSingle();
    if (plan) {
      await db.storage.from(BUCKET).remove([plan.file_path]);
    }
    const { error } = await db.from('design_studio_floor_plans').delete().eq('id', id);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
