import { notFound, redirect } from 'next/navigation';
import { getStaffUser, supabaseAdmin } from '@/lib/design-studio/server';
import FloorPlanEditor from '@/components/design-studio/floor-plan-editor/FloorPlanEditor';

export const dynamic = 'force-dynamic';

export default async function EditFloorPlanPage({ params }) {
  const user = await getStaffUser();
  if (!user) redirect('/login');
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: scan } = await db.from('design_studio_room_scans').select('*').eq('id', id).maybeSingle();
  if (!scan) notFound();

  const { data: quote } = await db
    .from('design_studio_quotes')
    .select('id, quote_number, created_by')
    .eq('id', scan.quote_id)
    .maybeSingle();
  if (quote && !user.isMaster && quote.created_by !== user.id) redirect('/design-studio');

  return (
    <FloorPlanEditor
      scan={{
        id: scan.id,
        quoteId: scan.quote_id,
        roomLabel: scan.room_label,
        elements: scan.elements || [],
        objects: scan.objects || [],
      }}
      quoteNumber={quote?.quote_number || null}
    />
  );
}
