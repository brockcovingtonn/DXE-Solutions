import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import ProposalDocument from '@/components/admin/ProposalDocument';
import ProposalDecisionPanel from '@/components/ProposalDecisionPanel';
import styles from '@/components/portal-shared.module.css';

export default async function ClientProposalDetailPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;
  const project = await getViewableProject(supabase, projectId, user, 'id, name');
  if (!project) notFound();

  // RLS already limits this select to non-draft, visible_to_client
  // proposals on projects the caller owns (admins/employees previewing
  // see everything via is_admin()) — same guarantee the list page relies on.
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .eq('project_id', projectId)
    .single();
  if (!proposal) notFound();

  const { data: lineItems } = await supabase
    .from('proposal_line_items')
    .select('*')
    .eq('proposal_id', params.proposalId)
    .order('sort_order');

  const { data: signature } = await supabase
    .from('proposal_signatures')
    .select('signer_name, created_at, signature_path')
    .eq('proposal_id', params.proposalId)
    .maybeSingle();

  const { data: decline } = await supabase
    .from('proposal_declines')
    .select('reason, created_at')
    .eq('proposal_id', params.proposalId)
    .maybeSingle();

  let signatureUrl = null;
  if (signature?.signature_path) {
    const { data } = await supabase.storage.from('proposal-signatures').createSignedUrl(signature.signature_path, 3600);
    signatureUrl = data?.signedUrl || null;
  }

  const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
  const currentUserName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  return (
    <div>
      <Link href={`/portal/projects/${projectId}/proposals`} style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
        ← Proposals
      </Link>

      <div className={styles.portalHeader}>
        <h1>{proposal.title}</h1>
        <p>{project.name}</p>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto 14px', textAlign: 'right' }}>
        {proposal.pdf_path ? (
          <a
            href={`/api/proposals/${proposal.id}/download`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-block', padding: '10px 18px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, fontWeight: 600, color: 'var(--navy)', textDecoration: 'none' }}
          >
            Download PDF
          </a>
        ) : null}
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <ProposalDecisionPanel
          proposalId={proposal.id}
          initialSignature={signature}
          initialDecline={decline}
          defaultName={currentUserName}
        />
      </div>

      <ProposalDocument
        proposal={{ ...proposal, proposal_signatures: signature, proposal_declines: decline }}
        lineItems={lineItems || []}
        signatureUrl={signatureUrl}
      />
    </div>
  );
}
