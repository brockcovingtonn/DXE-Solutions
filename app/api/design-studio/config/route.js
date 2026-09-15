import { requireStaff, requireMaster, supabaseAdmin, loadActiveConfig, jsonError } from '@/lib/design-studio/server';
import { DEFAULT_CONFIG } from '@/lib/design-studio/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await requireStaff(request);
    const config = await loadActiveConfig();
    return Response.json({ config });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * Saving rates never overwrites. It deactivates the current row and inserts a
 * new version, so every historical quote can still be traced to the rate card
 * that produced it.
 */
export async function PUT(request) {
  try {
    const user = await requireMaster(request);
    const body = await request.json();
    const incoming = body.config;
    if (!incoming || typeof incoming !== 'object') {
      const e = new Error('A config object is required.');
      e.status = 400;
      throw e;
    }

    const db = supabaseAdmin();
    const { data: current } = await db
      .from('design_studio_config')
      .select('id, version')
      .eq('is_active', true)
      .maybeSingle();

    const nextVersion = (current?.version || DEFAULT_CONFIG.version || 1) + 1;
    const merged = { ...DEFAULT_CONFIG, ...incoming, version: nextVersion };
    delete merged._configId;

    if (current?.id) {
      const { error: deactivateError } = await db
        .from('design_studio_config')
        .update({ is_active: false })
        .eq('id', current.id);
      if (deactivateError) throw deactivateError;
    }

    const { data, error } = await db
      .from('design_studio_config')
      .insert({
        version: nextVersion,
        config: merged,
        is_active: true,
        note: body.note || null,
        updated_by: user.id,
      })
      .select('id, version')
      .single();
    if (error) throw error;

    return Response.json({ config: merged, saved: data });
  } catch (err) {
    return jsonError(err);
  }
}

/** Restores the shipped defaults as a new version. */
export async function POST(request) {
  try {
    const user = await requireMaster(request);
    const db = supabaseAdmin();
    const { data: current } = await db
      .from('design_studio_config')
      .select('id, version')
      .eq('is_active', true)
      .maybeSingle();

    if (current?.id) {
      await db.from('design_studio_config').update({ is_active: false }).eq('id', current.id);
    }
    const nextVersion = (current?.version || 1) + 1;
    const { error } = await db.from('design_studio_config').insert({
      version: nextVersion,
      config: { ...DEFAULT_CONFIG, version: nextVersion },
      is_active: true,
      note: 'Reset to shipped defaults',
      updated_by: user.id,
    });
    if (error) throw error;
    return Response.json({ config: { ...DEFAULT_CONFIG, version: nextVersion } });
  } catch (err) {
    return jsonError(err);
  }
}
