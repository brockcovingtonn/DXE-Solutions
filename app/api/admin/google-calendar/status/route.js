import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// Surfaces only a boolean — google_calendar_connections holds live
// OAuth tokens and has no client-readable RLS policy, so this always
// goes through the admin client rather than exposing the table itself.
export async function GET(request) {
  const { supabase, user } = await getRequestClient(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('is_admin, is_employee').eq('id', user.id).single();
  if (!profile?.is_admin && !profile?.is_employee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from('google_calendar_connections')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ connected: !!connection });
}
