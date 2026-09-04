// The assistant route has its own shape (a tool-calling loop against the
// Anthropic API) so it doesn't fit the generic ADMIN_ROUTES table — both
// admin and client accounts are allowed in, just with a different tool
// list handed to the model. This covers the auth guard, the "not
// configured" guard, and the tool-use loop mechanics, with the Anthropic
// SDK and the tool executor both mocked out.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, fakeRequest } from '../helpers/fake-supabase';

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }));

const createMock = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    constructor() {
      this.messages = { create: createMock };
    }
  },
}));

const executeToolMock = vi.fn();
vi.mock('@/lib/assistant/tools', () => ({
  getToolDefinitions: vi.fn(() => []),
  executeTool: executeToolMock,
}));

const { createClient } = await import('@/lib/supabase-server');

async function callRoute(supabase, body) {
  createClient.mockReturnValue(supabase);
  const { POST } = await import('@/app/api/assistant/chat/route');
  return POST(fakeRequest(body));
}

describe('assistant chat POST (/api/assistant/chat)', () => {
  beforeEach(() => {
    createMock.mockReset();
    executeToolMock.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('401s when signed out', async () => {
    const res = await callRoute(createFakeSupabase({ user: null }), { messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(401);
  });

  it('500s with a clear message when ANTHROPIC_API_KEY is not set', async () => {
    const supabase = createFakeSupabase({ user: { id: 'client-1' } });
    const res = await callRoute(supabase, { messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('400s when messages is missing or empty', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: { profiles: { data: { first_name: 'Jane', is_admin: false }, error: null } },
    });
    const res = await callRoute(supabase, { messages: [] });
    expect(res.status).toBe(400);
  });

  it('returns the final text reply when the model answers directly, with no tool calls', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    createMock.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Your project is on track.' }],
    });

    const supabase = createFakeSupabase({
      user: { id: 'client-1' },
      responses: { profiles: { data: { first_name: 'Jane', is_admin: false }, error: null } },
    });
    const res = await callRoute(supabase, { messages: [{ role: 'user', content: 'How is my project doing?' }] });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('Your project is on track.');
    expect(executeToolMock).not.toHaveBeenCalled();
  });

  it('executes a tool call and feeds the result back before returning the final reply', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'call_1', name: 'get_project_details', input: { project_id: 'p1' } }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Here is the project status.' }],
      });
    executeToolMock.mockResolvedValueOnce({ project: { name: 'Calabasas Estate' } });

    const supabase = createFakeSupabase({
      user: { id: 'admin-1' },
      responses: { profiles: { data: { first_name: 'Dixie', is_admin: true }, error: null } },
    });
    const res = await callRoute(supabase, {
      messages: [{ role: 'user', content: 'What is the status of Calabasas Estate?' }],
      projectId: 'p1',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('Here is the project status.');
    expect(executeToolMock).toHaveBeenCalledWith('get_project_details', { project_id: 'p1' }, expect.objectContaining({ role: 'admin' }));
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('resolves an employee account to the employee role, not client', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'call_1', name: 'list_training_steps', input: {} }],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Here are the steps.' }],
      });
    executeToolMock.mockResolvedValueOnce({ training_steps: [] });

    const supabase = createFakeSupabase({
      user: { id: 'employee-1' },
      responses: { profiles: { data: { first_name: 'Sam', is_admin: false, is_employee: true }, error: null } },
    });
    const res = await callRoute(supabase, { messages: [{ role: 'user', content: 'What should I do next?' }] });

    expect(res.status).toBe(200);
    expect(executeToolMock).toHaveBeenCalledWith('list_training_steps', {}, expect.objectContaining({ role: 'employee' }));
  });
});
