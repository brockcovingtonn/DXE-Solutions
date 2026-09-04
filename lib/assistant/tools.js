import { createAdminClient } from '@/lib/supabase-admin';
import { syncEventToGoogle } from '@/lib/google-calendar';
import { canAccessAsStaff } from '@/lib/project-access';

// Tools available to every signed-in role. Read tools rely on the
// caller's own (RLS-scoped) supabase client, so each role automatically
// only ever sees what it's allowed to — a client sees only their own
// project(s) and whatever's flagged visible_to_client, an employee sees
// only their assigned project(s), the same rules the portal UI itself
// follows. Write tools are scoped per role below, gated both by which
// tools we hand the model (getToolDefinitions) and by RLS as a backstop.
const READ_ONLY_TOOLS = [
  {
    name: 'list_projects',
    description:
      "Lists projects the caller can see. For a client this is just their own project(s); for an employee, just the project(s) they're assigned to.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project_details',
    description:
      'Gets full details for one project: status, dates, progress, phases, milestones, permits, utilities, team, action items, documents on file, and accounting balance. Use this before answering any question about a specific project.',
    input_schema: {
      type: 'object',
      properties: { project_id: { type: 'string', description: 'The project UUID' } },
      required: ['project_id'],
    },
  },
  {
    name: 'get_calendar_events',
    description:
      "Lists calendar events. Pass project_id to scope to one project, or omit it to see everything the caller can see.",
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Optional project UUID to scope to' },
        from_date: { type: 'string', description: 'Optional ISO date, inclusive lower bound on start_time' },
        to_date: { type: 'string', description: 'Optional ISO date, inclusive upper bound on start_time' },
      },
    },
  },
];

// Admins and employees both get to browse DXE's internal training /
// workflow content — how the firm runs each type of project. There's no
// client-facing training page, so this is never offered to a client.
const STAFF_TOOLS = [
  {
    name: 'list_training_steps',
    description:
      "Lists DXE's internal training steps — the standard workflow for running a project, either general steps or steps specific to a project type. Always check this before answering a \"what do I do\" / \"how do we normally handle X\" question — prefer this over general knowledge.",
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: "Optional — 'General', or a project type such as 'Residential — ADU'. Omit to get everything.",
        },
      },
    },
  },
];

const ADMIN_WRITE_TOOLS = [
  {
    name: 'list_document_templates',
    description: 'Lists the standard document templates available to apply to a project.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'apply_document_template',
    description: "Generates a document by copying a template into a project's Documents.",
    input_schema: {
      type: 'object',
      properties: {
        template_id: { type: 'string' },
        project_id: { type: 'string' },
      },
      required: ['template_id', 'project_id'],
    },
  },
  {
    name: 'list_team_members',
    description: 'Lists admins and employees, for choosing who to assign an action item to.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_action_item',
    description: 'Creates a new action item on a project.',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        assigned_to: { type: 'string', description: 'Profile UUID of the admin/employee to assign this to, from list_team_members' },
        due_date: { type: 'string', description: 'ISO date, optional' },
        visible_to_client: { type: 'boolean', description: 'Whether the client should see this item. Defaults to false.' },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'update_action_item',
    description: 'Updates an existing action item — status, title, description, due date, or client visibility.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        status: { type: 'string', enum: ['open', 'done'] },
        title: { type: 'string' },
        description: { type: 'string' },
        due_date: { type: 'string' },
        visible_to_client: { type: 'boolean' },
      },
      required: ['item_id'],
    },
  },
  {
    name: 'create_calendar_event',
    description:
      "Creates a calendar event. Leave project_id unset for a general firm event. If the admin has Google Calendar connected, this also syncs to it.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        project_id: { type: 'string', description: 'Optional — omit for a general event' },
        description: { type: 'string' },
        start_time: { type: 'string', description: 'ISO 8601 datetime' },
        end_time: { type: 'string', description: 'ISO 8601 datetime, optional' },
        all_day: { type: 'boolean' },
        visible_to_client: { type: 'boolean' },
      },
      required: ['title', 'start_time'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Updates an existing calendar event.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        all_day: { type: 'boolean' },
        visible_to_client: { type: 'boolean' },
      },
      required: ['event_id'],
    },
  },
];

// Narrower than update_action_item on purpose — mirrors
// /api/action-items/[id]/status, the same open/done-only toggle the
// employee dashboard UI itself is limited to.
const EMPLOYEE_WRITE_TOOLS = [
  {
    name: 'update_action_item_status',
    description: "Marks one of the caller's own assigned action items open or done.",
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        status: { type: 'string', enum: ['open', 'done'] },
      },
      required: ['item_id', 'status'],
    },
  },
];

export function getToolDefinitions(role) {
  const tools = [...READ_ONLY_TOOLS];
  if (role === 'admin' || role === 'employee') tools.push(...STAFF_TOOLS);
  if (role === 'admin') tools.push(...ADMIN_WRITE_TOOLS);
  if (role === 'employee') tools.push(...EMPLOYEE_WRITE_TOOLS);
  return tools;
}

async function canAccessProject(supabase, projectId, role, userId) {
  if (role === 'employee') return canAccessAsStaff(supabase, projectId, userId);

  const query = supabase.from('projects').select('id').eq('id', projectId);
  const { data } = role === 'admin' ? await query.single() : await query.eq('owner_id', userId).single();
  return !!data;
}

async function listProjects({ supabase, role, user }) {
  let query = supabase
    .from('projects')
    .select('id, name, status, project_type, address, profiles!projects_owner_id_fkey(first_name, last_name)')
    .order('created_at', { ascending: false });
  if (role === 'client') query = query.eq('owner_id', user.id);
  // Admins see everything; RLS already scopes an employee's query to
  // their assigned projects with no extra filter needed.

  const { data, error } = await query;
  if (error) return { error: error.message };
  return {
    projects: (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      project_type: p.project_type,
      address: p.address,
      client: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : undefined,
    })),
  };
}

async function getProjectDetails({ supabase, role, user }, input) {
  const { project_id } = input;
  if (!(await canAccessProject(supabase, project_id, role, user.id))) {
    return { error: 'Project not found or not accessible.' };
  }

  const isStaff = role === 'admin' || role === 'employee';

  // permits: admins and employees both have direct table access (RLS),
  // which also includes the internal `notes` field; the client-safe RPC
  // is client-only and deliberately excludes it.
  const permitsQuery = isStaff
    ? supabase
        .from('permits')
        .select('permit_type, permit_number, agency, status, submitted_date, issued_date, expiration_date, notes')
        .eq('project_id', project_id)
        .order('sort_order')
    : supabase.rpc('get_project_permits', { p_project_id: project_id });

  // utilities: there's no employee-facing utilities view in the app
  // today (and no RLS policy granting employees access), so this is
  // admin- and client-only, exactly like the rest of the app.
  const utilitiesPromise =
    role === 'admin'
      ? supabase.rpc('get_project_utilities_admin', { p_project_id: project_id })
      : role === 'client'
        ? supabase.rpc('get_project_utilities', { p_project_id: project_id })
        : Promise.resolve({ data: [] });

  const [
    { data: project },
    { data: phases },
    { data: milestones },
    { data: permitsResult },
    { data: utilities },
    { data: team },
    { data: actionItems },
    { data: invoices },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(
        isStaff
          ? '*, profiles!projects_owner_id_fkey(first_name, last_name, email)'
          : 'name, address, status, project_type, progress_pct, started_on, estimated_completion, apn, jurisdiction, zoning, lot_size, building_size'
      )
      .eq('id', project_id)
      .single(),
    supabase.from('project_phases').select('name, state, percent, sort_order').eq('project_id', project_id).order('sort_order'),
    supabase.from('milestones').select('title, state, display_date').eq('project_id', project_id).order('sort_order'),
    permitsQuery,
    utilitiesPromise,
    supabase.from('project_team').select('name, trade, phone, email').eq('project_id', project_id).order('sort_order'),
    supabase.from('action_items').select('id, title, status, due_date, visible_to_client').eq('project_id', project_id),
    supabase.from('invoices').select('kind, description, amount, status, due_date').eq('project_id', project_id),
    supabase
      .from('documents')
      .select('file_name, file_type, badge, created_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }),
  ]);

  const balanceDue = (invoices || [])
    .filter((i) => i.kind === 'invoice' && i.status === 'unpaid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return {
    project,
    phases: phases || [],
    milestones: milestones || [],
    permits: permitsResult || [],
    utilities: utilities || [],
    team: team || [],
    action_items: actionItems || [],
    balance_due: balanceDue,
    invoices: invoices || [],
    documents: documents || [],
  };
}

async function getCalendarEvents({ supabase }, input) {
  const { project_id, from_date, to_date } = input;
  let query = supabase.from('calendar_events').select('id, title, description, start_time, end_time, all_day, project_id, visible_to_client').order('start_time');
  if (project_id) query = query.eq('project_id', project_id);
  if (from_date) query = query.gte('start_time', from_date);
  if (to_date) query = query.lte('start_time', to_date);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { events: data || [] };
}

async function listTrainingSteps({ supabase }, input) {
  let query = supabase.from('training_steps').select('category, title, description, sort_order').order('category').order('sort_order');
  if (input.category) query = query.eq('category', input.category);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { training_steps: data || [] };
}

async function listDocumentTemplates({ supabase }) {
  const { data, error } = await supabase.from('document_templates').select('id, name, description, category').order('name');
  if (error) return { error: error.message };
  return { templates: data || [] };
}

async function applyDocumentTemplate({ supabase }, input) {
  const { template_id, project_id } = input;

  const { data: template } = await supabase.from('document_templates').select('*').eq('id', template_id).single();
  if (!template) return { error: 'Template not found.' };

  const adminClient = createAdminClient();
  const { data: fileData, error: downloadError } = await adminClient.storage
    .from('document-templates')
    .download(template.file_path);
  if (downloadError) return { error: downloadError.message };

  const newFilePath = `${project_id}/${Date.now()}-${template.file_name}`;
  const { error: uploadError } = await adminClient.storage
    .from('project-documents')
    .upload(newFilePath, fileData, { contentType: fileData.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      project_id,
      file_name: template.file_name,
      file_path: newFilePath,
      file_type: template.file_name.split('.').pop(),
      badge: 'new',
      uploaded_by_role: 'dxe',
    })
    .select()
    .single();
  if (insertError) return { error: insertError.message };

  return { success: true, document: doc };
}

async function listTeamMembers({ supabase }) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, is_admin, is_employee')
    .or('is_admin.eq.true,is_employee.eq.true')
    .order('first_name');
  if (error) return { error: error.message };
  return {
    people: (data || []).map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      role: p.is_admin ? 'admin' : 'employee',
    })),
  };
}

async function createActionItem({ supabase, user }, input) {
  const { project_id, title, description, assigned_to, due_date, visible_to_client } = input;
  if (!project_id || !title?.trim()) return { error: 'project_id and title are required.' };

  const { data: item, error } = await supabase
    .from('action_items')
    .insert({
      project_id,
      title: title.trim(),
      description: description || null,
      assigned_to: assigned_to || null,
      visible_to_client: !!visible_to_client,
      due_date: due_date || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, item };
}

async function updateActionItem({ supabase }, input) {
  const { item_id, ...fields } = input;
  if (!item_id) return { error: 'item_id is required.' };

  const update = {};
  ['status', 'title', 'description', 'due_date', 'visible_to_client'].forEach((key) => {
    if (key in fields) update[key] = fields[key];
  });
  if (update.status === 'done') update.completed_at = new Date().toISOString();
  if (update.status === 'open') update.completed_at = null;

  const { error } = await supabase.from('action_items').update(update).eq('id', item_id);
  if (error) return { error: error.message };
  return { success: true };
}

async function updateActionItemStatus({ supabase, user }, input) {
  const { item_id, status } = input;
  if (!item_id || (status !== 'open' && status !== 'done')) {
    return { error: 'item_id and a valid status (open or done) are required.' };
  }

  const { data: item } = await supabase.from('action_items').select('id, project_id').eq('id', item_id).single();
  if (!item) return { error: 'Action item not found.' };

  const allowed = await canAccessAsStaff(supabase, item.project_id, user.id);
  if (!allowed) return { error: 'Not permitted.' };

  const { error } = await supabase
    .from('action_items')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', item_id);
  if (error) return { error: error.message };
  return { success: true };
}

async function createCalendarEvent({ supabase, user }, input) {
  const { title, project_id, description, start_time, end_time, all_day, visible_to_client } = input;
  if (!title?.trim() || !start_time) return { error: 'title and start_time are required.' };

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      project_id: project_id || null,
      title: title.trim(),
      description: description || null,
      start_time,
      end_time: end_time || null,
      all_day: !!all_day,
      visible_to_client: !!visible_to_client,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  try {
    const adminClient = createAdminClient();
    const googleEventId = await syncEventToGoogle(adminClient, user.id, event);
    if (googleEventId && googleEventId !== event.google_event_id) {
      await supabase.from('calendar_events').update({ google_event_id: googleEventId }).eq('id', event.id);
    }
  } catch (syncErr) {
    console.error('Google Calendar sync error:', syncErr);
  }

  return { success: true, event };
}

async function updateCalendarEvent({ supabase }, input) {
  const { event_id, ...fields } = input;
  if (!event_id) return { error: 'event_id is required.' };

  const update = {};
  ['title', 'description', 'start_time', 'end_time', 'all_day', 'visible_to_client'].forEach((key) => {
    if (key in fields) update[key] = fields[key];
  });

  const { error } = await supabase.from('calendar_events').update(update).eq('id', event_id);
  if (error) return { error: error.message };
  return { success: true };
}

const EXECUTORS = {
  list_projects: listProjects,
  get_project_details: getProjectDetails,
  get_calendar_events: getCalendarEvents,
  list_training_steps: listTrainingSteps,
  list_document_templates: listDocumentTemplates,
  apply_document_template: applyDocumentTemplate,
  list_team_members: listTeamMembers,
  create_action_item: createActionItem,
  update_action_item: updateActionItem,
  update_action_item_status: updateActionItemStatus,
  create_calendar_event: createCalendarEvent,
  update_calendar_event: updateCalendarEvent,
};

const TOOL_ROLES = {
  list_projects: ['admin', 'employee', 'client'],
  get_project_details: ['admin', 'employee', 'client'],
  get_calendar_events: ['admin', 'employee', 'client'],
  list_training_steps: ['admin', 'employee'],
  list_document_templates: ['admin'],
  apply_document_template: ['admin'],
  list_team_members: ['admin'],
  create_action_item: ['admin'],
  update_action_item: ['admin'],
  update_action_item_status: ['employee'],
  create_calendar_event: ['admin'],
  update_calendar_event: ['admin'],
};

export async function executeTool(name, input, ctx) {
  const allowedRoles = TOOL_ROLES[name];
  if (!allowedRoles || !allowedRoles.includes(ctx.role)) {
    return { error: 'Not permitted.' };
  }

  const executor = EXECUTORS[name];
  if (!executor) return { error: `Unknown tool: ${name}` };

  try {
    return await executor(ctx, input || {});
  } catch (err) {
    console.error(`Assistant tool "${name}" error:`, err);
    return { error: 'Tool execution failed.' };
  }
}
