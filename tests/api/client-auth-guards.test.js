// Client-facing routes guard on "is this user signed in, and do they own
// this project" rather than an admin flag, via the shared getViewableProject
// helper — which also lets an admin preview any project (e.g. from "view as
// client" links on the admin dashboard).
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase, fakeRequest, fakeGetRequest } from '../helpers/fake-supabase';

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/email-notifications', () => ({
  notifyAdminOfClientActivity: vi.fn(),
  notifyClientOfProjectUpdate: vi.fn(),
}));

const { createClient } = await import('@/lib/supabase-server');

describe('documents POST (/api/documents)', () => {
  async function callRoute(supabase, body) {
    createClient.mockReturnValue(supabase);
    const { POST } = await import('@/app/api/documents/route');
    return POST(fakeRequest(body));
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), {});
    expect(res.status).toBe(401);
  });

  it('404s when signed in but does not own the project and is not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: [{ data: null, error: null }],
        profiles: { data: { is_admin: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', fileName: 'a.pdf', filePath: 'x/a.pdf' });
    expect(res.status).toBe(404);
  });

  it('succeeds when the signed-in user owns the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: [{ data: { id: 'p1', name: 'Test Project', owner_id: 'client-1' }, error: null }],
        documents: { data: { id: 'doc-1' }, error: null },
        profiles: { data: { first_name: 'Jane', last_name: 'Doe' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', fileName: 'a.pdf', filePath: 'x/a.pdf' });
    expect(res.status).toBe(200);
  });

  it('succeeds when an admin previews a project they do not own', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        projects: [{ data: null, error: null }, { data: { id: 'p1', name: 'Test Project' }, error: null }],
        profiles: { data: { is_admin: true, first_name: 'Dixie', last_name: 'Admin' }, error: null },
        documents: { data: { id: 'doc-1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', fileName: 'a.pdf', filePath: 'x/a.pdf' });
    expect(res.status).toBe(200);
  });
});

describe('notes POST (/api/notes)', () => {
  async function callRoute(supabase, body) {
    createClient.mockReturnValue(supabase);
    const { POST } = await import('@/app/api/notes/route');
    return POST(fakeRequest(body));
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), {});
    expect(res.status).toBe(401);
  });

  it('404s when signed in but does not own the project and is not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: [{ data: null, error: null }],
        profiles: { data: { is_admin: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(404);
  });

  it('succeeds when the signed-in user owns the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: [{ data: { id: 'p1', name: 'Test Project', owner_id: 'client-1' }, error: null }],
        notes: { data: { id: 'note-1' }, error: null },
        profiles: { data: { first_name: 'Jane', last_name: 'Doe' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(200);
  });
});

describe('documents/[id]/download GET (/api/documents/[id]/download)', () => {
  async function callRoute(supabase) {
    createClient.mockReturnValue(supabase);
    const { GET } = await import('@/app/api/documents/[id]/download/route');
    return GET(fakeRequest(), { params: { id: 'doc-1' } });
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }));
    expect(res.status).toBe(401);
  });

  it('404s when signed in but does not own the document and is not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        documents: { data: { file_path: 'x/a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }],
        profiles: { data: { is_admin: false }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(404);
  });

  it('redirects to a signed URL when the signed-in user owns the document', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        documents: { data: { file_path: 'x/a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: { id: 'p1' }, error: null }],
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });

  it('redirects to a signed URL for an admin previewing a document on a project they do not own', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        documents: { data: { file_path: 'x/a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }, { data: { id: 'p1' }, error: null }],
        profiles: { data: { is_admin: true }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });
});

describe('photos/[id]/download GET (/api/photos/[id]/download)', () => {
  async function callRoute(supabase) {
    createClient.mockReturnValue(supabase);
    const { GET } = await import('@/app/api/photos/[id]/download/route');
    return GET(fakeRequest(), { params: { id: 'photo-1' } });
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }));
    expect(res.status).toBe(401);
  });

  it('404s when signed in but does not own the photo and is not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        photos: { data: { file_path: 'x/a.jpg', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }],
        profiles: { data: { is_admin: false }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(404);
  });

  it('redirects to a signed URL when the signed-in user owns the photo', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        photos: { data: { file_path: 'x/a.jpg', project_id: 'p1' }, error: null },
        projects: [{ data: { id: 'p1' }, error: null }],
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });

  it('redirects to a signed URL for an admin previewing a photo on a project they do not own', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        photos: { data: { file_path: 'x/a.jpg', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }, { data: { id: 'p1' }, error: null }],
        profiles: { data: { is_admin: true }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });
});

describe('action-items/[id]/status PATCH (/api/action-items/[id]/status)', () => {
  async function callRoute(supabase, body) {
    createClient.mockReturnValue(supabase);
    const { PATCH } = await import('@/app/api/action-items/[id]/status/route');
    return PATCH(fakeRequest(body), { params: { id: 'item-1' } });
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), { status: 'done' });
    expect(res.status).toBe(401);
  });

  it('403s for a signed-in user who is neither admin nor an assigned employee', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        action_items: { data: { id: 'item-1', project_id: 'p1' }, error: null },
        profiles: { data: { is_admin: false, is_employee: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { status: 'done' });
    expect(res.status).toBe(403);
  });

  it("403s for an employee who is not assigned to the item's project", async () => {
    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: {
        action_items: { data: { id: 'item-1', project_id: 'p1' }, error: null },
        profiles: { data: { is_admin: false, is_employee: true }, error: null },
        project_employees: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { status: 'done' });
    expect(res.status).toBe(403);
  });

  it('succeeds for an employee assigned to the item\'s project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: {
        action_items: [
          { data: { id: 'item-1', project_id: 'p1' }, error: null },
          { data: null, error: null },
        ],
        profiles: { data: { is_admin: false, is_employee: true }, error: null },
        project_employees: { data: { project_id: 'p1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { status: 'done' });
    expect(res.status).toBe(200);
  });

  it('succeeds for an admin regardless of assignment', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        action_items: [
          { data: { id: 'item-1', project_id: 'p1' }, error: null },
          { data: null, error: null },
        ],
        profiles: { data: { is_admin: true, is_employee: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { status: 'done' });
    expect(res.status).toBe(200);
  });
});

describe('reviews POST (/api/reviews)', () => {
  async function callRoute(supabase, body) {
    createClient.mockReturnValue(supabase);
    const { POST } = await import('@/app/api/reviews/route');
    return POST(fakeRequest(body));
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), {});
    expect(res.status).toBe(401);
  });

  it('404s when the signed-in user does not own the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', rating: 5 });
    expect(res.status).toBe(404);
  });

  it('succeeds when the signed-in user owns the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        projects: { data: { id: 'p1', project_type: 'Residential — New Construction' }, error: null },
        profiles: { data: { first_name: 'Jane', last_name: 'Doe' }, error: null },
        reviews: { data: { id: 'review-1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', rating: 5, body: 'Great work!' });
    expect(res.status).toBe(200);
  });
});

describe('reviews/[id] PATCH and DELETE (/api/reviews/[id])', () => {
  it('PATCH 401s when signed out', async () => {
    createClient.mockReturnValue(createFakeSupabase({ user: null }));
    const { PATCH } = await import('@/app/api/reviews/[id]/route');
    const res = await PATCH(fakeRequest({ rating: 4 }), { params: { id: 'review-1' } });
    expect(res.status).toBe(401);
  });

  it('DELETE 401s when signed out', async () => {
    createClient.mockReturnValue(createFakeSupabase({ user: null }));
    const { DELETE } = await import('@/app/api/reviews/[id]/route');
    const res = await DELETE(fakeRequest(), { params: { id: 'review-1' } });
    expect(res.status).toBe(401);
  });
});

describe('invoices/[id]/download GET (/api/invoices/[id]/download)', () => {
  async function callRoute(supabase) {
    createClient.mockReturnValue(supabase);
    const { GET } = await import('@/app/api/invoices/[id]/download/route');
    return GET(fakeRequest(), { params: { id: 'invoice-1' } });
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }));
    expect(res.status).toBe(401);
  });

  it('404s when signed in but does not own the invoice and is not an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        invoices: { data: { file_path: 'x/a.pdf', file_name: 'a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }],
        profiles: { data: { is_admin: false }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(404);
  });

  it('redirects to a signed URL when the signed-in user owns the invoice', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        invoices: { data: { file_path: 'x/a.pdf', file_name: 'a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: { id: 'p1' }, error: null }],
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });

  it('redirects to a signed URL for an admin previewing an invoice on a project they do not own', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        invoices: { data: { file_path: 'x/a.pdf', file_name: 'a.pdf', project_id: 'p1' }, error: null },
        projects: [{ data: null, error: null }, { data: { id: 'p1' }, error: null }],
        profiles: { data: { is_admin: true }, error: null },
      },
    });
    const res = await callRoute(supabase);
    expect(res.status).toBe(307);
  });
});

describe('messages POST (/api/messages)', () => {
  async function callRoute(supabase, body) {
    createClient.mockReturnValue(supabase);
    const { POST } = await import('@/app/api/messages/route');
    return POST(fakeRequest(body));
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), {});
    expect(res.status).toBe(401);
  });

  it('404s for a signed-in user who does not own the project, is not admin, and is not an assigned employee', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: { data: { is_admin: false, is_employee: false }, error: null },
        projects: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(404);
  });

  it('succeeds for the client who owns the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: { data: { first_name: 'Jane', last_name: 'Doe', is_admin: false, is_employee: false }, error: null },
        projects: { data: { id: 'p1' }, error: null },
        messages: { data: { id: 'm1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(200);
  });

  it("404s for an employee who isn't assigned to the project", async () => {
    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: {
        profiles: { data: { is_admin: false, is_employee: true }, error: null },
        project_employees: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(404);
  });

  it('succeeds for an employee assigned to the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: {
        profiles: { data: { first_name: 'Sam', last_name: 'Lee', is_admin: false, is_employee: true }, error: null },
        project_employees: { data: { project_id: 'p1' }, error: null },
        messages: { data: { id: 'm1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(200);
  });

  it('succeeds for an admin regardless of ownership or assignment', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        profiles: { data: { first_name: 'Dixie', last_name: 'Admin', is_admin: true, is_employee: false }, error: null },
        messages: { data: { id: 'm1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1', text: 'hello' });
    expect(res.status).toBe(200);
  });

  it('400s a DM send with no dmUserId when the sender is an admin', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        profiles: { data: { first_name: 'Dixie', last_name: 'Admin', is_admin: true, is_employee: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { text: 'hello' });
    expect(res.status).toBe(400);
  });

  it('forces a client DM send onto their own thread regardless of the dmUserId in the request body', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: { data: { first_name: 'Jane', last_name: 'Doe', is_admin: false, is_employee: false }, error: null },
        messages: { data: { id: 'm1', dm_user_id: 'client-1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { dmUserId: 'someone-else', text: 'hello' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message.dm_user_id).toBe('client-1');
  });

  it('lets an admin DM send target another user directly', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        profiles: { data: { first_name: 'Dixie', last_name: 'Admin', is_admin: true, is_employee: false }, error: null },
        messages: { data: { id: 'm1', dm_user_id: 'client-1' }, error: null },
      },
    });
    const res = await callRoute(supabase, { dmUserId: 'client-1', text: 'hello' });
    expect(res.status).toBe(200);
  });
});

describe('messages thread GET (/api/messages/thread)', () => {
  async function callRoute(supabase, params) {
    createClient.mockReturnValue(supabase);
    const { GET } = await import('@/app/api/messages/thread/route');
    return GET(fakeGetRequest(params));
  }

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), { projectId: 'p1' });
    expect(res.status).toBe(401);
  });

  it('400s when neither projectId nor dmUserId is given', async () => {
    const supabase = createFakeSupabase({ user: { id: 'client-1' } });
    const res = await callRoute(supabase, {});
    expect(res.status).toBe(400);
  });

  it('404s a project thread for a client who does not own the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: { data: { is_admin: false, is_employee: false }, error: null },
        projects: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1' });
    expect(res.status).toBe(404);
  });

  it('200s a project thread for the client who owns the project', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: [
          { data: { is_admin: false, is_employee: false }, error: null },
          { data: [{ id: 'admin-1', first_name: 'Dixie', last_name: 'Admin' }], error: null },
        ],
        projects: [
          { data: { id: 'p1' }, error: null },
          { data: { owner_id: 'client-1', profiles: { id: 'client-1', first_name: 'Jane', last_name: 'Doe' } }, error: null },
        ],
        project_employees: { data: [], error: null },
        messages: { data: [], error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1' });
    expect(res.status).toBe(200);
  });

  it("404s a project thread for an employee who isn't assigned to the project", async () => {
    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: {
        profiles: { data: { is_admin: false, is_employee: true }, error: null },
        project_employees: { data: null, error: null },
      },
    });
    const res = await callRoute(supabase, { projectId: 'p1' });
    expect(res.status).toBe(404);
  });

  it('200s a DM thread for the owning client', async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: [
          { data: { is_admin: false, is_employee: false }, error: null },
          { data: [{ id: 'admin-1', first_name: 'Dixie', last_name: 'Admin' }], error: null },
        ],
        messages: { data: [], error: null },
      },
    });
    const res = await callRoute(supabase, { dmUserId: 'client-1' });
    expect(res.status).toBe(200);
  });

  it("404s a DM thread when a non-admin requests someone else's thread", async () => {
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: {
        profiles: { data: { is_admin: false, is_employee: false }, error: null },
      },
    });
    const res = await callRoute(supabase, { dmUserId: 'client-2' });
    expect(res.status).toBe(404);
  });

  it("200s a DM thread for an admin opening another user's thread", async () => {
    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: {
        profiles: [
          { data: { is_admin: true, is_employee: false }, error: null },
          { data: { id: 'client-1', first_name: 'Jane', last_name: 'Doe' }, error: null },
        ],
        messages: { data: [], error: null },
      },
    });
    const res = await callRoute(supabase, { dmUserId: 'client-1' });
    expect(res.status).toBe(200);
  });
});
