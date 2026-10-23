-- Supports recording a partial (or full) manual payment against a
-- specific invoice, distinct from the existing "receipt" kind (an
-- expense DXE paid on the client's behalf, not money received from
-- them). A payment row is an `invoices` row with kind = 'payment' and
-- invoice_id pointing at the invoice it was applied to; the remaining
-- balance on that invoice is computed as
-- amount - sum(payments where invoice_id = invoice.id), not stored.
alter table public.invoices
  add column if not exists invoice_id uuid references public.invoices(id) on delete cascade;

create index if not exists invoices_invoice_id_idx on public.invoices(invoice_id);
