-- =====================================================================
-- DXE Solutions — Stripe invoice payments
--
-- Adds the columns needed to let a client pay an invoice online via
-- Stripe Checkout (card, Apple/Google Pay, ACH bank transfer, Cash App
-- Pay — whichever methods are enabled in the Stripe Dashboard).
--
-- No RLS changes: the Stripe webhook writes with the service-role key,
-- and clients already read their own shared invoices (all columns) via
-- the existing "Clients can view shared invoices" policy.
-- =====================================================================

alter table public.invoices
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_via text,               -- 'stripe' | 'manual' | null
  add column if not exists payment_method text,          -- 'card' | 'us_bank_account' | 'cashapp' | ...
  add column if not exists payment_state text not null default 'idle';
  -- payment_state: 'idle' | 'processing' (ACH clearing) | 'failed'

comment on column public.invoices.payment_state is
  'idle = nothing pending; processing = client paid but funds still clearing (ACH); failed = last online payment attempt failed';
