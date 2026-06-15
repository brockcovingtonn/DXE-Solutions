import { createClient } from '@/lib/supabase-server';
import styles from '@/components/portal-shared.module.css';
import TemplateUpload from '@/components/admin/TemplateUpload';
import TemplateList from '@/components/admin/TemplateList';

export default async function TemplatesPage() {
  const supabase = createClient();

  const [{ data: templates }, { data: projects }] = await Promise.all([
    supabase.from('document_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name'),
  ]);

  return (
    <div>
      <div className={styles.portalHeader}>
        <h1>Templates</h1>
        <p>Standard documents Dixie reuses across projects</p>
      </div>

      <div className={styles.fullWidthCard}>
        <h3>Add a template</h3>
        <TemplateUpload />
      </div>

      <div className={styles.fullWidthCard}>
        <h3>All templates ({templates?.length || 0})</h3>
        <TemplateList templates={templates || []} allProjects={projects || []} />
      </div>
    </div>
  );
}
