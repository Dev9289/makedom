document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();

  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  // Load Profile
  const profile = await getProfile();
  if (profile) {
    document.getElementById('acc-name').textContent = profile.full_name || 'User';
    document.getElementById('acc-email').textContent = profile.email;
    document.getElementById('acc-avatar').textContent = (profile.full_name || profile.email).charAt(0).toUpperCase();
  }

  // Load Assigned Projects
  const container = document.getElementById('project-container');
  const { data, error } = await _supabase
    .from('user_assigned_projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="no-project" style="border-color:#e05555;color:#e05555">Error loading projects: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="no-project">No projects have been assigned to you yet.</div>`;
    return;
  }

  container.innerHTML = `<div style="display:flex;flex-direction:column;gap:24px;">` + data.map(p => {
    let statusColor = p.status === 'completed' ? 'var(--gold)' : (p.status === 'canceled' ? '#e05555' : 'var(--muted-light)');
    return `
    <div class="project-card reveal visible" style="border-top: 4px solid ${statusColor};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div class="project-title" style="margin-bottom:0;">${p.title}</div>
        <span class="badge" style="background:transparent; border-color:${statusColor}; color:${statusColor}; text-transform:uppercase;">${p.status || 'pending'}</span>
      </div>
      <div class="project-detail"><strong>Mobile:</strong> ${p.mobile_number}</div>
      <div class="project-detail"><strong>Price:</strong> ${p.price ? '$' + parseFloat(p.price).toLocaleString() : 'TBD'}</div>
      <div class="project-message">
        <strong style="color:var(--white);display:block;margin-bottom:8px">Message from Admin:</strong>
        ${p.message.replace(/\n/g, '<br>')}
      </div>
    </div>
  `}).join('') + `</div>`;
});
