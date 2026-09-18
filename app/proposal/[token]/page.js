import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/design-studio/server';
import ProposalDocument from '@/components/design-studio/ProposalDocument';
import DownloadProposalButton from '@/components/design-studio/DownloadProposalButton';
import { BRAND, DESIGN_STUDIO_CONTACT, C } from '@/lib/design-studio/brand';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from('design_studio_quotes')
    .select('quote_number, client_name')
    .eq('share_token', token)
    .maybeSingle();
  return {
    title: data ? `${BRAND.name} — Proposal ${data.quote_number}` : BRAND.name,
    robots: { index: false, follow: false },
  };
}

/**
 * Unauthenticated, reachable only with the token. No internal figures are sent
 * to the browser: only the columns below are selected, and the internal block
 * is stripped from the pricing snapshot before render.
 */
export default async function PublicProposalPage({ params }) {
  const { token } = await params;
  const db = supabaseAdmin();

  const { data: quote } = await db
    .from('design_studio_quotes')
    .select('id, quote_number, status, client_name, project_address, pricing, included_override, hide_addon_menu, valid_until, created_at')
    .eq('share_token', token)
    .maybeSingle();

  if (!quote) notFound();

  const { data: scanRows } = await db
    .from('design_studio_room_scans')
    .select('id, room_label, area_sqft, model_path, floor_plan_path, model_gltf_path, elements, objects')
    .eq('quote_id', quote.id)
    .eq('show_to_client', true)
    .order('created_at', { ascending: false });

  const roomScans = await Promise.all(
    (scanRows || []).map(async (scan) => {
      const [{ data: model }, { data: floorPlan }, { data: modelGltf }] = await Promise.all([
        db.storage.from('design-studio-scans').createSignedUrl(scan.model_path, 3600),
        scan.floor_plan_path
          ? db.storage.from('design-studio-scans').createSignedUrl(scan.floor_plan_path, 3600)
          : Promise.resolve({ data: null }),
        scan.model_gltf_path
          ? db.storage.from('design-studio-scans').createSignedUrl(scan.model_gltf_path, 3600)
          : Promise.resolve({ data: null }),
      ]);
      return {
        id: scan.id,
        roomLabel: scan.room_label,
        areaSqft: scan.area_sqft,
        modelUrl: model?.signedUrl || null,
        floorPlanUrl: floorPlan?.signedUrl || null,
        modelGltfUrl: modelGltf?.signedUrl || null,
        elements: scan.elements || [],
        objects: scan.objects || [],
      };
    })
  );

  const { data: floorPlanRows } = await db
    .from('design_studio_floor_plans')
    .select('id, file_name, file_type, is_renderable, file_path')
    .eq('quote_id', quote.id)
    .eq('show_to_client', true)
    .order('created_at', { ascending: false });

  const floorPlans = await Promise.all(
    (floorPlanRows || []).map(async (plan) => {
      const { data } = await db.storage
        .from('design-studio-scans')
        .createSignedUrl(plan.file_path, 3600, { download: !plan.is_renderable });
      return { id: plan.id, file_name: plan.file_name, file_type: plan.file_type, file_url: data?.signedUrl || null };
    })
  );

  const { internal, inputs, ...safePricing } = quote.pricing || {};
  const pricing = {
    ...safePricing,
    inputs: {
      areaSqft: inputs?.areaSqft ?? 0,
      projectType: inputs?.projectType,
      serviceLevel: inputs?.serviceLevel,
    },
  };

  const expired =
    quote.status === 'expired' ||
    (quote.valid_until && new Date(`${quote.valid_until}T23:59:59`) < new Date());

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '36px 18px 70px' }}>
      {expired ? (
        <div
          className="ds-no-print"
          style={{
            maxWidth: 780, margin: '0 auto 16px', background: '#F5EAE4', color: C.warn,
            border: `1px solid #E8D5C9`, borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
            fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          This proposal has passed its validity date. Please contact {BRAND.name} for current pricing.
        </div>
      ) : null}

      <div className="ds-no-print" style={{ maxWidth: 780, margin: '0 auto 14px', textAlign: 'right' }}>
        <DownloadProposalButton />
      </div>

      <ProposalDocument quote={quote} pricing={pricing} roomScans={roomScans} floorPlans={floorPlans} />

      <div
        className="ds-no-print"
        style={{
          maxWidth: 780, margin: '20px auto 0', textAlign: 'center', fontSize: 13, color: C.muted,
          fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        Questions about this proposal? Contact {DESIGN_STUDIO_CONTACT.email}.
      </div>
    </div>
  );
}
