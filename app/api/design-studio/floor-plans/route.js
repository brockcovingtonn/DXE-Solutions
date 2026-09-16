import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';
const URL_TTL = 3600;

const RENDERABLE_EXTENSIONS = new Set(['pdf']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);

function classify(fileName) {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  if (RENDERABLE_EXTENSIONS.has(ext)) return { fileType: 'pdf', isRenderable: true };
  if (IMAGE_EXTENSIONS.has(ext)) return { fileType: 'image', isRenderable: true };
  if (CAD_EXTENSIONS.has(ext)) return { fileType: 'cad', isRenderable: false };
  return { fileType: 'other', isRenderable: false };
}

async function signFloorPlan(db, plan) {
  const { projects, ...rest } = plan;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(plan.file_path, URL_TTL, { download: !plan.is_renderable });
  return { ...rest, project_name: projects?.name || null, file_url: data?.signedUrl || null };
}

// Registers a floor plan after the file has already been uploaded straight
// to Storage via the signed URL from upload-url. file_type/is_renderable
// are derived server-side from the extension, not trusted from the client.
export async function POST(request) {
  try {
    const user = await requireStaff(request);
    const body = await request.json();
    if (!body.id || !body.path || !body.fileName) {
      const e = new Error('id, path and fileName are required');
      e.status = 400;
      throw e;
    }

    const { fileType, isRenderable } = classify(body.fileName);
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('design_studio_floor_plans')
      .insert({
        id: body.id,
        quote_id: body.quoteId || null,
        project_id: body.projectId || null,
        file_name: body.fileName,
        file_path: body.path,
        file_type: fileType,
        is_renderable: isRenderable,
        show_to_client: Boolean(body.showToClient),
        created_by: user.id,
        created_by_name: user.name,
      })
      .select('*, projects(name)')
      .single();
    if (error) throw error;

    return Response.json({ floorPlan: await signFloorPlan(db, data) }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

export async function GET(request) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');
    const projectId = searchParams.get('projectId');
    if (!quoteId && !projectId) {
      const e = new Error('quoteId or projectId is required');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    let query = db.from('design_studio_floor_plans').select('*, projects(name)').order('created_at', { ascending: false });
    query = quoteId ? query.eq('quote_id', quoteId) : query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;

    const floorPlans = await Promise.all((data || []).map((plan) => signFloorPlan(db, plan)));
    return Response.json({ floorPlans });
  } catch (err) {
    return jsonError(err);
  }
}
