// Helper for client-portal pages: returns the project if the current
// user owns it, OR if the current user is an admin (admins can preview
// any project via "View as client" links from the admin dashboard).

export async function getViewableProject(supabase, projectId, user, selectColumns = 'id, name') {
  // Try as owner first
  const { data: ownedProject } = await supabase
    .from('projects')
    .select(selectColumns)
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single();

  if (ownedProject) return ownedProject;

  // Check if user is an admin - if so, allow viewing any project
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profile?.is_admin) {
    const { data: anyProject } = await supabase
      .from('projects')
      .select(selectColumns)
      .eq('id', projectId)
      .single();

    return anyProject || null;
  }

  return null;
}

// Returns true if the current user can act as staff on this project — an
// admin, or an employee assigned to it. Used by internal tools (action
// item status toggles, the cover sheet generator) that admins and
// assigned employees both need to use, but clients never should.
export async function canAccessAsStaff(supabase, projectId, userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_employee')
    .eq('id', userId)
    .single();

  if (profile?.is_admin) return true;
  if (!profile?.is_employee) return false;

  const { data: assignment } = await supabase
    .from('project_employees')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('employee_id', userId)
    .maybeSingle();

  return !!assignment;
}

// Everyone who can see a project's chat: the owning client, any admin,
// and any employee assigned to the project. Used to render a presence
// roster (who's online) in the chat UI.
export async function getProjectRoster(supabase, projectId) {
  const [{ data: project }, { data: employeeLinks }, { data: admins }] = await Promise.all([
    supabase
      .from('projects')
      .select('owner_id, profiles!projects_owner_id_fkey(id, first_name, last_name)')
      .eq('id', projectId)
      .single(),
    supabase
      .from('project_employees')
      .select('profiles(id, first_name, last_name)')
      .eq('project_id', projectId),
    supabase.from('profiles').select('id, first_name, last_name').eq('is_admin', true),
  ]);

  const roster = [];
  if (project?.profiles) roster.push({ ...project.profiles, role: 'client' });
  (employeeLinks || []).forEach((e) => {
    if (e.profiles) roster.push({ ...e.profiles, role: 'employee' });
  });
  (admins || []).forEach((a) => roster.push({ ...a, role: 'admin' }));

  return roster;
}
