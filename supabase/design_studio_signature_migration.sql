alter table public.design_studio_quotes
  add column if not exists signature_path text,
  add column if not exists signer_name text,
  add column if not exists signed_at timestamptz,
  add column if not exists decline_reason text;
