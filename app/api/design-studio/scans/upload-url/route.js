import { randomUUID } from 'crypto';
import { requireStaff, supabaseAdmin, jsonError } from '@/lib/design-studio/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'design-studio-scans';

// Room scan files (USDZ models, several MB) upload straight to Storage from
// the native app rather than through this route's body — a serverless
// function's request-size limit isn't a great fit for that. This just
// mints short-lived signed upload URLs scoped to a fresh scan id; the
// actual bytes never pass through Next.js.
export async function POST(request) {
  try {
    await requireStaff(request);
    const db = supabaseAdmin();
    const scanId = randomUUID();

    const { data: modelUpload, error: modelError } = await db.storage
      .from(BUCKET)
      .createSignedUploadUrl(`${scanId}/model.usdz`);
    if (modelError) throw modelError;

    const { data: floorPlanUpload, error: floorPlanError } = await db.storage
      .from(BUCKET)
      .createSignedUploadUrl(`${scanId}/floor-plan.png`);
    if (floorPlanError) throw floorPlanError;

    // Simplified box-mesh glTF, rendered in-browser via <model-viewer>. The
    // USDZ above is the AR/Quick-Look source instead — no browser besides
    // iOS Safari can render USDZ directly.
    const { data: modelGltfUpload, error: modelGltfError } = await db.storage
      .from(BUCKET)
      .createSignedUploadUrl(`${scanId}/model.glb`);
    if (modelGltfError) throw modelGltfError;

    return Response.json({
      scanId,
      model: { path: modelUpload.path, token: modelUpload.token },
      floorPlan: { path: floorPlanUpload.path, token: floorPlanUpload.token },
      modelGltf: { path: modelGltfUpload.path, token: modelGltfUpload.token },
    });
  } catch (err) {
    return jsonError(err);
  }
}
