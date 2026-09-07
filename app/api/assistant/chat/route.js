import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { getToolDefinitions, executeTool } from '@/lib/assistant/tools';

// The web portal authenticates via cookies (handled by lib/supabase-server).
// The native app has no cookies — it sends its Supabase access token as a
// Bearer header instead. When present, build a client scoped to that token
// so RLS still applies exactly as it does for the mobile app's direct
// Supabase queries; otherwise fall back to the normal cookie-based client.
function getBearerToken(request) {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

const MODEL = 'claude-sonnet-5';
const MAX_TOOL_ITERATIONS = 6;

function buildSystemPrompt({ role, firstName, projectId }) {
  const today = new Date().toISOString().slice(0, 10);

  const roleContext =
    role === 'admin'
      ? 'Dixie, the admin — she can see and manage every project'
      : role === 'employee'
        ? `${firstName || 'a team member'} — an employee who can only see and work the project(s) they're assigned to. They can look up training/workflow steps, project details, documents on file, and the calendar, and mark their own assigned action items open/done — but they cannot create action items, create or edit calendar events, or generate documents from templates; those are admin-only.`
        : `${firstName || 'a client'} — a client, who can only ever see their own project(s), and only what has been explicitly marked visible to them`;

  return `You are the DXE Solutions internal assistant, built into the DXE Solutions client portal. DXE Solutions manages permitting and project management for civil engineering / property development projects.

Today's date is ${today}.
You are talking to ${roleContext}.
${projectId ? `They are currently viewing project ${projectId} — assume that's the project in question unless they say otherwise.` : ''}
${role === 'employee' ? "When asked what to do, or how DXE normally handles a step of a project, check list_training_steps for DXE's standard workflow before answering — prefer that real content over your own general assumptions." : ''}

Always use the available tools to look up real data before answering questions about a project — never guess or invent project details. When asked to create or update something, call the matching tool, then confirm plainly what happened (or what went wrong). Keep replies concise and conversational, not a wall of text.`;
}

export async function POST(request) {
  const bearerToken = getBearerToken(request);

  const supabase = bearerToken
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
        auth: { persistSession: false },
      })
    : createClient();

  const {
    data: { user },
  } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The assistant is not set up yet — ANTHROPIC_API_KEY is missing.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages, projectId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, is_admin, is_employee')
      .eq('id', user.id)
      .single();

    const role = profile?.is_admin ? 'admin' : profile?.is_employee ? 'employee' : 'client';
    const ctx = { supabase, user, role };
    const tools = getToolDefinitions(role);
    const system = buildSystemPrompt({ role, firstName: profile?.first_name, projectId });

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
        ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
        : undefined,
    });
    const conversation = [...messages];
    let finalText = '';

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools,
        messages: conversation,
      });

      conversation.push({ role: 'assistant', content: response.content });

      if (response.stop_reason !== 'tool_use') {
        finalText = response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');
        break;
      }

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await executeTool(block.name, block.input, ctx);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      conversation.push({ role: 'user', content: toolResults });

      if (i === MAX_TOOL_ITERATIONS - 1) {
        finalText = "I wasn't able to finish that in one go — could you try breaking it into a smaller step?";
      }
    }

    return NextResponse.json({ reply: finalText, messages: conversation });
  } catch (err) {
    console.error('Assistant chat error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
