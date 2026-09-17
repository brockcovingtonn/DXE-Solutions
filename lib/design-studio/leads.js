import { randomBytes } from 'crypto';
import { supabaseAdmin, loadActiveConfig } from './server';
import { calculateQuote, validUntil } from './pricing';
import { BRAND } from './brand';

// A lead exists only between "someone asked to be contacted" and "they
// filled out the intake form" — see supabase/design_studio_leads_migration.sql.
// Shared by both entry points: the public Book-a-call form (app/api/estimate)
// and the staff "Send Intake Form" button (app/api/design-studio/leads).

export async function createLead(db, { fullName, email, phone, projectAddress }) {
  const { data, error } = await db
    .from('design_studio_leads')
    .insert({
      full_name: fullName || null,
      email: email || null,
      phone: phone || null,
      project_address: projectAddress || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Reuses an existing account if this email already has one — unlike the
// staff "new client" picker (api/design-studio/clients POST), which errors
// on a duplicate, this path runs unattended off a public form submission
// and should just attach to whoever already exists.
export async function findOrCreateClientAccount(db, { firstName, lastName, email, phone }) {
  if (email) {
    const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existing) return existing.id;
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password: randomBytes(24).toString('hex'),
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (createError) throw createError;

  const userId = created.user.id;
  await db.from('profiles').update({ first_name: firstName, last_name: lastName, phone: phone || null }).eq('id', userId);
  return userId;
}

// The intake-submission conversion: find-or-create the client account,
// insert a real draft quote (source: 'web_lead'), delete the lead. Pricing
// inputs are placeholders — staff re-price for real via the existing
// "Re-price draft" flow once they've reviewed the intake answers.
export async function convertLeadToQuote(db, lead, intake) {
  const [firstName, ...rest] = (lead.full_name || '').trim().split(/\s+/);
  const clientId = await findOrCreateClientAccount(db, {
    firstName: firstName || lead.email || 'Client',
    lastName: rest.join(' '),
    email: lead.email,
    phone: lead.phone,
  });

  const config = await loadActiveConfig();
  const inputs = { projectType: 'kitchen', serviceLevel: 'design', complexity: 'standard', areaSqft: 0, addOns: {} };
  const pricing = calculateQuote(inputs, config);

  const { data: numberRow, error: numberError } = await db.rpc('design_studio_next_quote_number', { prefix: BRAND.quotePrefix });
  if (numberError) throw numberError;

  const { data: quote, error } = await db
    .from('design_studio_quotes')
    .insert({
      quote_number: numberRow,
      status: 'draft',
      source: 'web_lead',
      client_id: clientId,
      client_name: lead.full_name || null,
      client_email: lead.email || null,
      client_phone: lead.phone || null,
      project_address: lead.project_address || null,
      project_type: pricing.inputs.projectType,
      service_level: pricing.inputs.serviceLevel,
      complexity: pricing.inputs.complexity,
      area_sqft: pricing.inputs.areaSqft,
      add_ons: {},
      intake: intake || {},
      intake_submitted_at: new Date().toISOString(),
      pricing,
      config_snapshot: config,
      total: pricing.total,
      deposit: pricing.deposit,
      valid_until: validUntil(config),
    })
    .select('id, quote_number, share_token')
    .single();
  if (error) throw error;

  await db.from('design_studio_leads').delete().eq('id', lead.id);

  return quote;
}
