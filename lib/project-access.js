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
