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

// Registers a scan after the native app has already uploaded its model +
// floor plan straight to Storage via the signed URLs from upload-url.
export async function POST(request) {
  try {
    const user = await requireStaff(request);
    const body = await request.json();
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
        room_label: body.roomLabel || null,
        area_sqft: body.areaSqft != null ? Number(body.areaSqft) : null,
        area_is_estimate: Boolean(body.areaIsEstimate),
        wall_count: Number(body.wallCount) || 0,
        door_count: Number(body.doorCount) || 0,
        window_count: Number(body.windowCount) || 0,
        model_path: `${body.scanId}/model.usdz`,
        floor_plan_path: `${body.scanId}/floor-plan.png`,
        created_by: user.id,
        created_by_name: user.name,
      })
      .select('*')
      .single();
    if (error) throw error;

    const signed = await signScan(db, data);
    return Response.json({ scan: signed }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

// Scans attached to a quote — the quote detail page's "room scan" panel.
export async function GET(request) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');
    if (!quoteId) {
      const e = new Error('quoteId is required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('design_studio_room_scans')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const scans = await Promise.all((data || []).map((scan) => signScan(db, scan)));
    return Response.json({ scans });
  } catch (err) {
    return jsonError(err);
  }
}
