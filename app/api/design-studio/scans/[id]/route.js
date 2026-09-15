import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';
const URL_TTL = 3600;

async function signScan(db, scan) {
  const [{ data: model }, { data: floorPlan }] = await Promise.all([
    db.storage.from(BUCKET).createSignedUrl(scan.model_path, URL_TTL),
    scan.floor_plan_path
      ? db.storage.from(BUCKET).createSignedUrl(scan.floor_plan_path, URL_TTL)
      : Promise.resolve({ data: null }),
  ]);
  return { ...scan, model_url: model?.signedUrl || null, floor_plan_url: floorPlan?.signedUrl || null };
}

export async function GET(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();
    const { data, error } = await db.from('design_studio_room_scans').select('*').eq('id', id).maybeSingle();
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

    const { data, error } = await db
      .from('design_studio_room_scans')
      .update(patch)
      .eq('id', id)
      .select('*')
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

    const { data: scan } = await db.from('design_studio_room_scans').select('model_path, floor_plan_path').eq('id', id).maybeSingle();
    if (scan) {
      await db.storage.from(BUCKET).remove([scan.model_path, scan.floor_plan_path].filter(Boolean));
    }
    const { error } = await db.from('design_studio_room_scans').delete().eq('id', id);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
