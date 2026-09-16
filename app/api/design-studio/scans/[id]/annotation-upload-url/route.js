import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';

// The annotated PDF (floor plan + PencilKit markup + measurements page) is
// built and uploaded from the native app after the scan already exists, so
// unlike the initial capture's upload-url this mints a single signed slot
// at a deterministic path under the existing scan id.
export async function POST(request, { params }) {
  try {
    await requireStaff(request);
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: scan, error: scanError } = await db
      .from('design_studio_room_scans')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (scanError) throw scanError;
    if (!scan) {
      const e = new Error('Scan not found');
      e.status = 404;
      throw e;
    }

    const path = `${id}/annotated.pdf`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;

    return Response.json({ path: data.path, token: data.token });
  } catch (err) {
    return jsonError(err);
  }
}
