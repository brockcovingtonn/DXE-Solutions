import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

// Global search across clients, projects, contacts, and documents —
// admin-only (clients/employees already have a much narrower slice of
// data, so "which tab is this in" isn't the problem for them). Plain
// ILIKE matching is proportionate at this business's scale; no need
// for full-text search infrastructure.
export async function GET(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ clients: [], projects: [], contacts: [], documents: [] });
  }

  const like = `%${q.replace(/[%_]/g, '\\$&')}%`;

  const [{ data: clients }, { data: projects }, { data: contacts }, { data: documents }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('is_admin', false)
      .eq('is_employee', false)
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .limit(8),
    supabase
      .from('projects')
      .select('id, name, address')
      .or(`name.ilike.${like},address.ilike.${like}`)
      .limit(8),
    supabase
      .from('contacts')
      .select('id, name, company, trade, email')
      .or(`name.ilike.${like},company.ilike.${like},trade.ilike.${like},email.ilike.${like}`)
      .limit(8),
    supabase
      .from('documents')
      .select('id, file_name, project_id, projects(name)')
      .ilike('file_name', like)
      .limit(8),
  ]);

  return NextResponse.json({
    clients: clients || [],
    projects: projects || [],
    contacts: contacts || [],
    documents: documents || [],
  });
}
