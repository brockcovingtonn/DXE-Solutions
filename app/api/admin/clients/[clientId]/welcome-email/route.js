import { NextResponse } from 'next/server';
import { getRequestClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendPortalWelcomeEmail } from '@/lib/email-notifications';

export async function POST(request, { params }) {
  const { supabase, user } = await getRequestClient(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // The login email lives on the auth user, not necessarily the profile
  // contact email — pull it from auth so the instructions are accurate.
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(params.clientId);
  if (authErr || !authUser?.user) {
    return NextResponse.json({ error: 'Client account not found' }, { status: 404 });
  }

  const { data: client } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', params.clientId)
    .single();

  const loginEmail = authUser.user.email;
  const contactEmail = client?.email || loginEmail;
  const clientName = [client?.first_name, client?.last_name].filter(Boolean).join(' ');

  const result = await sendPortalWelcomeEmail({
    clientEmail: contactEmail,
    clientName,
    loginEmail,
  });

  if (result?.error) {
    return NextResponse.json({ error: 'Could not send the email. Please try again.' }, { status: 502 });
  }
  if (result?.skipped) {
    return NextResponse.json({ error: 'Email is not configured on the server.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, sentTo: contactEmail });
}
