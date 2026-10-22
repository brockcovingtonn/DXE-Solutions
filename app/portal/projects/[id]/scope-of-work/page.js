import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getViewableProject } from '@/lib/project-access';
import styles from '@/components/portal-shared.module.css';
import ScopeOfWorkEditor from '@/components/ScopeOfWorkEditor';

export default async function ScopeOfWorkPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projectId = params.id;

  const project = await getViewableProject(supabase, projectId, user, 'id, name');

  if (!project) notFound();

  // RLS-scoped (not service-role) — the client-view policy on scope_areas/
  // scope_items limits this to the client's own project for free, same
  // guarantee getViewableProject already gave the project row itself.
  const { data: scopeAreas } = await supabase
    .from('scope_areas')
    .select('*, scope_items(*)')
    .eq('project_id', projectId)
    .order('sort_order');
  (scopeAreas || []).forEach((area) => {
    area.scope_items = (area.scope_items || []).sort((a, b) => a.sort_order - b.sort_order);
  });

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Scope of Work</h1>
        <p>{project.name} · Checked off as work is completed</p>
      </div>

      <div className={styles.fullWidthCard}>
        <ScopeOfWorkEditor projectId={projectId} areas={scopeAreas || []} isAdmin={false} readOnly />
      </div>
    </div>
  );
}
