import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';

// Global search for clients and employees — same idea as
// /api/admin/search, but scoped by RLS rather than an admin gate: a
// client only ever gets matches from their own projects, an employee
// only from projects they're assigned to. No "clients" group here,
// since browsing other client accounts isn't part of either role.
export async function GET(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ projects: [], contacts: [], documents: [] });
  }

  const like = `%${q.replace(/[%_]/g, '\\$&')}%`;

  const [{ data: projects }, { data: contacts }, { data: documents }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, address')
      .or(`name.ilike.${like},address.ilike.${like}`)
      .limit(8),
    supabase
      .from('contacts')
      .select('id, name, company, trade, email, phone')
      .or(`name.ilike.${like},company.ilike.${like},trade.ilike.${like},email.ilike.${like}`)
      .limit(8),
    supabase
      .from('documents')
      .select('id, file_name, project_id, projects(name)')
      .ilike('file_name', like)
      .limit(8),
  ]);

  return NextResponse.json({
    projects: projects || [],
    contacts: contacts || [],
    documents: documents || [],
  });
}
