import { requireStaff, loadActiveConfig, jsonError } from '@/lib/design-studio/server';
import { calculateQuote } from '@/lib/design-studio/pricing';

export const dynamic = 'force-dynamic';

// Prices a form's current state without saving anything. The web builder
// imports calculateQuote() directly and recomputes on every keystroke; the
// native app has no JS runtime to import it into, so it calls this instead.
// Nothing here is trusted for a real save — POST /quotes recalculates
// server-side again before writing.
export async function POST(request) {
  try {
    await requireStaff(request);
    const body = await request.json();
    const config = await loadActiveConfig();
    const quote = calculateQuote(body, config);
    return Response.json({ quote });
  } catch (err) {
    return jsonError(err);
  }
}
