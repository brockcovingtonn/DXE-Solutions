// Every route under app/api/admin is supposed to be admin-only, but the
// `requireAdmin` check is copy-pasted independently into each route file
// rather than shared — so it's easy for a new or edited handler to end up
// with a missing or broken guard. This suite exercises every admin route
// handler the same way: signed-out must 401, signed-in-but-not-admin must
// 403, and signed-in-as-admin must not be blocked by either check.
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase, fakeRequest } from '../helpers/fake-supabase';

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase-admin', () => ({ createAdminClient: vi.fn(() => createFakeSupabase()) }));

const { createClient } = await import('@/lib/supabase-server');

const ADMIN_ROUTES = [
  { name: 'admin/action-items POST', mod: '@/app/api/admin/action-items/route', method: 'POST' },
  { name: 'admin/action-items/[id] PATCH', mod: '@/app/api/admin/action-items/[id]/route', method: 'PATCH', params: { id: 'item-1' } },
  { name: 'admin/action-items/[id] DELETE', mod: '@/app/api/admin/action-items/[id]/route', method: 'DELETE', params: { id: 'item-1' } },
  { name: 'admin/calendar-events POST', mod: '@/app/api/admin/calendar-events/route', method: 'POST' },
  { name: 'admin/calendar-events/[id] PATCH', mod: '@/app/api/admin/calendar-events/[id]/route', method: 'PATCH', params: { id: 'event-1' } },
  { name: 'admin/calendar-events/[id] DELETE', mod: '@/app/api/admin/calendar-events/[id]/route', method: 'DELETE', params: { id: 'event-1' } },
  { name: 'admin/google-calendar/connect GET', mod: '@/app/api/admin/google-calendar/connect/route', method: 'GET' },
  { name: 'admin/google-calendar/disconnect POST', mod: '@/app/api/admin/google-calendar/disconnect/route', method: 'POST' },
  { name: 'admin/clients POST', mod: '@/app/api/admin/clients/route', method: 'POST' },
  { name: 'admin/clients/[clientId] PUT', mod: '@/app/api/admin/clients/[clientId]/route', method: 'PUT', params: { clientId: 'client-1' } },
  { name: 'admin/contacts POST', mod: '@/app/api/admin/contacts/route', method: 'POST' },
  { name: 'admin/contacts/[id] PUT', mod: '@/app/api/admin/contacts/[id]/route', method: 'PUT', params: { id: 'contact-1' } },
  { name: 'admin/contacts/[id] DELETE', mod: '@/app/api/admin/contacts/[id]/route', method: 'DELETE', params: { id: 'contact-1' } },
  { name: 'admin/documents POST', mod: '@/app/api/admin/documents/route', method: 'POST' },
  { name: 'admin/documents/[id] PATCH', mod: '@/app/api/admin/documents/[id]/route', method: 'PATCH', params: { id: 'doc-1' } },
  { name: 'admin/documents/[id] DELETE', mod: '@/app/api/admin/documents/[id]/route', method: 'DELETE', params: { id: 'doc-1' } },
  { name: 'admin/employees POST', mod: '@/app/api/admin/employees/route', method: 'POST' },
  { name: 'admin/employees/[employeeId] PUT', mod: '@/app/api/admin/employees/[employeeId]/route', method: 'PUT', params: { employeeId: 'employee-1' } },
  { name: 'admin/employees/[employeeId] DELETE', mod: '@/app/api/admin/employees/[employeeId]/route', method: 'DELETE', params: { employeeId: 'employee-1' } },
  { name: 'admin/employees/[employeeId]/projects PUT', mod: '@/app/api/admin/employees/[employeeId]/projects/route', method: 'PUT', params: { employeeId: 'employee-1' } },
  { name: 'admin/invoices POST', mod: '@/app/api/admin/invoices/route', method: 'POST' },
  { name: 'admin/invoices/[id] PATCH', mod: '@/app/api/admin/invoices/[id]/route', method: 'PATCH', params: { id: 'invoice-1' } },
  { name: 'admin/invoices/[id] DELETE', mod: '@/app/api/admin/invoices/[id]/route', method: 'DELETE', params: { id: 'invoice-1' } },
  { name: 'admin/milestones PUT', mod: '@/app/api/admin/milestones/route', method: 'PUT' },
  { name: 'admin/notes POST', mod: '@/app/api/admin/notes/route', method: 'POST' },
  { name: 'admin/notes/[id] PATCH', mod: '@/app/api/admin/notes/[id]/route', method: 'PATCH', params: { id: 'note-1' } },
  { name: 'admin/notes/[id] DELETE', mod: '@/app/api/admin/notes/[id]/route', method: 'DELETE', params: { id: 'note-1' } },
  { name: 'admin/permits POST', mod: '@/app/api/admin/permits/route', method: 'POST' },
  { name: 'admin/permits/[id] PATCH', mod: '@/app/api/admin/permits/[id]/route', method: 'PATCH', params: { id: 'permit-1' } },
  { name: 'admin/permits/[id] DELETE', mod: '@/app/api/admin/permits/[id]/route', method: 'DELETE', params: { id: 'permit-1' } },
  { name: 'admin/phases PUT', mod: '@/app/api/admin/phases/route', method: 'PUT' },
  { name: 'admin/reviews/[id] PATCH', mod: '@/app/api/admin/reviews/[id]/route', method: 'PATCH', params: { id: 'review-1' } },
  { name: 'admin/reviews/[id] DELETE', mod: '@/app/api/admin/reviews/[id]/route', method: 'DELETE', params: { id: 'review-1' } },
  { name: 'admin/photos POST', mod: '@/app/api/admin/photos/route', method: 'POST' },
  { name: 'admin/photos/[id] DELETE', mod: '@/app/api/admin/photos/[id]/route', method: 'DELETE', params: { id: 'photo-1' } },
  { name: 'admin/projects POST', mod: '@/app/api/admin/projects/route', method: 'POST' },
  { name: 'admin/projects/[id] PATCH', mod: '@/app/api/admin/projects/[id]/route', method: 'PATCH', params: { id: 'project-1' } },
  { name: 'admin/projects/[id]/employees PUT', mod: '@/app/api/admin/projects/[id]/employees/route', method: 'PUT', params: { id: 'project-1' } },
  { name: 'admin/team PUT', mod: '@/app/api/admin/team/route', method: 'PUT' },
  { name: 'admin/training POST', mod: '@/app/api/admin/training/route', method: 'POST' },
  { name: 'admin/training/[id] PATCH', mod: '@/app/api/admin/training/[id]/route', method: 'PATCH', params: { id: 'step-1' } },
  { name: 'admin/training/[id] DELETE', mod: '@/app/api/admin/training/[id]/route', method: 'DELETE', params: { id: 'step-1' } },
  { name: 'admin/templates POST', mod: '@/app/api/admin/templates/route', method: 'POST' },
  { name: 'admin/templates/[id] DELETE', mod: '@/app/api/admin/templates/[id]/route', method: 'DELETE', params: { id: 'template-1' } },
  { name: 'admin/templates/apply POST', mod: '@/app/api/admin/templates/apply/route', method: 'POST' },
  { name: 'admin/utilities PUT', mod: '@/app/api/admin/utilities/route', method: 'PUT' },
  { name: 'admin/utility-entries POST', mod: '@/app/api/admin/utility-entries/route', method: 'POST' },
  { name: 'admin/utility-entries/[id] PATCH', mod: '@/app/api/admin/utility-entries/[id]/route', method: 'PATCH', params: { id: 'entry-1' } },
  { name: 'admin/utility-entries/[id] DELETE', mod: '@/app/api/admin/utility-entries/[id]/route', method: 'DELETE', params: { id: 'entry-1' } },
];

describe.each(ADMIN_ROUTES)('$name', ({ mod, method, params }) => {
  async function callRoute(supabase) {
    createClient.mockReturnValue(supabase);
    const route = await import(/* @vite-ignore */ mod);
    return route[method](fakeRequest({}), { params: params || {} });
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }));
    expect(res.status).toBe(401);
  });

  it('403s when signed in but not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'user-1' },
      responses: { profiles: { data: { is_admin: false }, error: null } },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(403);
  });

  it('is not blocked by the auth guard when signed in as an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        profiles: { data: { is_admin: true, first_name: 'Dixie', last_name: 'Admin' }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
