import { randomUUID } from 'crypto';
import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';

function sanitizeFileName(name) {
  const cleaned = String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(-120) || 'file';
}

// Same signed-upload-URL pattern as room scans — CAD files can be several
// MB, so the bytes go straight to Storage rather than through this route.
export async function POST(request) {
  try {
    await requireStaff(request);
    const body = await request.json();
    const fileName = sanitizeFileName(body.fileName);

    const db = supabaseAdmin();
    const id = randomUUID();
    const path = `floor-plans/${id}/${fileName}`;

    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;

    return Response.json({ id, fileName, path: data.path, token: data.token });
  } catch (err) {
    return jsonError(err);
  }
}
