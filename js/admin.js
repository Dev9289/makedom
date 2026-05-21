// ============================================================
//  Admin Panel Module — Full CRUD
// ============================================================

let currentEditId = null;
let adminUser = null;

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  adminUser = await Auth.requireAdmin();
  setupSidebar();
  setupSidebarNav();
  setupMobileSidebar();

  // Show avatar initials
  const av = document.getElementById('sidebar-avatar');
  if (av && adminUser?.email) av.textContent = adminUser.email[0].toUpperCase();
  const em = document.getElementById('sidebar-email');
  if (em) em.textContent = adminUser?.email || '';

  document.getElementById('admin-logout')?.addEventListener('click', Auth.logout);
  document.getElementById('topbar-logout')?.addEventListener('click', Auth.logout);

  await loadSection('overview');
});

// ─── Sidebar Nav ─────────────────────────────────────────
function setupSidebarNav() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.dataset.section;
      if (!section) return;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      loadSection(section);
      // Close mobile sidebar
      const sidebar = document.querySelector('.admin-sidebar');
      if (window.innerWidth < 800) sidebar?.classList.remove('open');
    });
  });
}

function setupMobileSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar   = document.querySelector('.admin-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function setTopbarTitle(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = title;
}

// ─── Section Router ───────────────────────────────────────
async function loadSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(`section-${name}`);
  if (sec) sec.classList.add('active');

  const titles = { overview:'Dashboard Overview', projects:'Manage Projects', stats:'Edit Site Stats', messages:'Contact Messages', users:'Registered Users', assigned:'Assigned Projects', clients:'Outreach CRM' };
  setTopbarTitle(titles[name] || 'Admin');

  if (name === 'overview')  await loadOverview();
  if (name === 'projects')  await loadProjectsAdmin();
  if (name === 'stats')     await loadStatsAdmin();
  if (name === 'messages')  await loadMessagesAdmin();
  if (name === 'users')     await loadUsersAdmin();
  if (name === 'assigned')  await loadAssignedProjectsAdmin();
  if (name === 'clients')   await loadClientsAdmin();
}

// ─── Overview ─────────────────────────────────────────────
async function loadOverview() {
  const [projRes, msgRes, statRes] = await Promise.all([
    _supabase.from('projects').select('id', { count: 'exact', head: true }),
    _supabase.from('messages').select('id', { count: 'exact', head: true }),
    _supabase.from('site_stats').select('*').eq('id',1).single(),
  ]);

  setText('ov-projects',  projRes.count ?? 0);
  setText('ov-messages',  msgRes.count  ?? 0);
  setText('ov-websites',  statRes.data?.websites_completed ?? 0);
  setText('ov-clients',   statRes.data?.happy_clients ?? 0);

  // badge counts
  setBadge('badge-messages', msgRes.count ?? 0);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setBadge(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ─── Projects CRUD ────────────────────────────────────────
async function loadProjectsAdmin() {
  const tbody = document.getElementById('projects-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner" style="margin:auto"></div></td></tr>`;

  const { data, error } = await _supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error || !data) { tbody.innerHTML = `<tr><td colspan="6" style="color:var(--muted);padding:20px">Error loading projects.</td></tr>`; return; }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><img class="table-img" src="${p.image_url||''}" alt="${p.title}" onerror="this.style.display='none'"></td>
      <td class="td-title">${p.title}</td>
      <td>${(p.technologies||[]).join(', ')}</td>
      <td class="td-gold">${p.price ? '$'+Number(p.price).toLocaleString() : '—'}</td>
      <td>${p.featured ? '<span class="badge">Featured</span>' : '—'}</td>
      <td>
        <span class="badge" style="${p.is_public !== false ? 'background:rgba(201,168,76,0.1);color:var(--gold)' : 'background:rgba(224,85,85,0.1);color:#e05555;border-color:#e05555'}">
          ${p.is_public !== false ? 'Public' : 'Private'}
        </span>
      </td>
      <td><div class="td-actions">
        <button class="btn-table-edit" onclick="openProjectModal('${p.id}')">Edit</button>
        <button class="btn-table-del"  onclick="deleteProject('${p.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
}

function openProjectModal(id = null) {
  currentEditId = id;
  const modal = document.getElementById('project-modal');
  const title = document.getElementById('modal-proj-title');
  const form  = document.getElementById('project-form');
  form.reset();
  document.getElementById('modal-proj-id').value = '';

  if (id) {
    title.textContent = 'Edit Project';
    _supabase.from('projects').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      document.getElementById('proj-title').value       = data.title || '';
      document.getElementById('proj-desc').value        = data.description || '';
      document.getElementById('proj-techs').value       = (data.technologies||[]).join(', ');
      document.getElementById('proj-price').value       = data.price || '';
      document.getElementById('proj-url').value         = data.project_url || '';
      document.getElementById('proj-image').value       = ''; // File inputs can't be set programmatically
      document.getElementById('proj-featured').checked  = data.featured || false;
      document.getElementById('proj-public').checked    = data.is_public !== false;
      document.getElementById('modal-proj-id').value    = id;
    });
  } else {
    title.textContent = 'Add New Project';
  }
  modal.classList.add('open');
}

document.getElementById('project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('modal-proj-id').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  // Handle Image Upload
  const fileInput = document.getElementById('proj-image');
  const file = fileInput.files[0];
  let imageUrl = null;

  if (file) {
    btn.textContent = 'Uploading Image...';
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await _supabase.storage
      .from('project-images')
      .upload(fileName, file);
      
    if (uploadError) {
      Auth.showToast('Image upload failed: ' + uploadError.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Save Project ✦';
      return;
    }
    
    // Get public URL
    const { data: { publicUrl } } = _supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);
      
    imageUrl = publicUrl;
  }

  const payload = {
    title:        document.getElementById('proj-title').value.trim(),
    description:  document.getElementById('proj-desc').value.trim(),
    technologies: document.getElementById('proj-techs').value.split(',').map(t=>t.trim()).filter(Boolean),
    price:        parseFloat(document.getElementById('proj-price').value) || null,
    project_url:  document.getElementById('proj-url').value.trim() || null,
    featured:     document.getElementById('proj-featured').checked,
    is_public:    document.getElementById('proj-public').checked,
  };
  
  if (imageUrl) {
    payload.image_url = imageUrl;
  }

  btn.textContent = 'Saving Project...';
  const { error } = id
    ? await _supabase.from('projects').update(payload).eq('id', id)
    : await _supabase.from('projects').insert([payload]);

  btn.disabled = false;
  btn.textContent = 'Save Project ✦';
  
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast(id ? 'Project updated!' : 'Project added!', 'success');
  closeModal('project-modal');
  await loadProjectsAdmin();
  await loadOverview();
});

async function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const { error } = await _supabase.from('projects').delete().eq('id', id);
  if (error) { Auth.showToast('Delete failed: ' + error.message, 'error'); return; }
  Auth.showToast('Project deleted.', 'info');
  await loadProjectsAdmin();
  await loadOverview();
}

// ─── Stats Admin ──────────────────────────────────────────
async function loadStatsAdmin() {
  const { data } = await _supabase.from('site_stats').select('*').eq('id',1).single();
  if (!data) return;
  document.getElementById('stat-websites-input').value = data.websites_completed || 0;
  document.getElementById('stat-projects-input').value = data.projects_delivered || 0;
  document.getElementById('stat-clients-input').value  = data.happy_clients || 0;
  document.getElementById('stat-years-input').value    = data.years_experience || 0;
}

document.getElementById('stats-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    websites_completed: parseInt(document.getElementById('stat-websites-input').value)||0,
    projects_delivered: parseInt(document.getElementById('stat-projects-input').value)||0,
    happy_clients:      parseInt(document.getElementById('stat-clients-input').value)||0,
    years_experience:   parseInt(document.getElementById('stat-years-input').value)||0,
    updated_at: new Date().toISOString(),
  };
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  const { error } = await _supabase.from('site_stats').update(payload).eq('id',1);
  btn.disabled = false;
  if (error) { Auth.showToast('Error: '+error.message,'error'); return; }
  Auth.showToast('Stats updated!','success');
});

// ─── Messages Admin ───────────────────────────────────────
async function loadMessagesAdmin() {
  const grid = document.getElementById('messages-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const { data, error } = await _supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) {
    grid.innerHTML = `<p style="color:var(--muted);padding:40px;text-align:center">${error ? error.message : 'No messages yet.'}</p>`;
    return;
  }

  grid.innerHTML = `<div class="msg-grid">${data.map(m => {
    let statusColor = m.status === 'completed' ? 'var(--gold)' : (m.status === 'canceled' ? '#e05555' : 'var(--muted-light)');
    return `
    <div class="msg-card" style="border-top: 3px solid ${statusColor}">
      <div class="msg-header">
        <div class="msg-name">${m.full_name}</div>
        <div class="msg-date">${new Date(m.created_at).toLocaleDateString()}</div>
      </div>
      <div class="msg-phone">📞 ${m.phone}</div>
      <div class="msg-request">${m.request}</div>
      <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; color:${statusColor}; font-weight:600; text-transform:uppercase">${m.status || 'pending'}</span>
        <select class="form-input" style="width:140px; padding:6px 10px; font-size:0.85rem;" onchange="updateMessageStatus('${m.id}', this.value)">
          <option value="pending" ${m.status==='pending'?'selected':''}>Pending</option>
          <option value="completed" ${m.status==='completed'?'selected':''}>Completed</option>
          <option value="canceled" ${m.status==='canceled'?'selected':''}>Canceled</option>
        </select>
      </div>
    </div>`;
  }).join('')}</div>`;

  setBadge('badge-messages', data.filter(m => m.status === 'pending').length);
}

async function updateMessageStatus(id, newStatus) {
  if (newStatus === 'completed') {
    openConvertModal(id);
    return;
  }
  const { error } = await _supabase.from('messages').update({ status: newStatus }).eq('id', id);
  if (error) Auth.showToast('Error: ' + error.message, 'error');
  else {
    Auth.showToast('Message status updated', 'success');
    await loadMessagesAdmin();
  }
}

// Convert Message to Assigned Project
let currentConvertMsgId = null;
async function openConvertModal(msgId) {
  currentConvertMsgId = msgId;
  const modal = document.getElementById('convert-modal');
  document.getElementById('convert-form').reset();
  document.getElementById('convert-msg-id').value = msgId;
  
  const userSelect = document.getElementById('convert-user');
  userSelect.innerHTML = '<option value="">Loading users...</option>';
  
  // Fetch users for dropdown
  const { data: users } = await _supabase.from('profiles').select('id, email, full_name');
  if (users) {
    userSelect.innerHTML = '<option value="">-- Select a User --</option>' + 
      users.map(u => `<option value="${u.id}">${u.full_name || 'User'} (${u.email})</option>`).join('');
  }
  
  // Pre-fill message data
  const { data: msg } = await _supabase.from('messages').select('*').eq('id', msgId).single();
  if (msg) {
    document.getElementById('convert-mobile').value = msg.phone;
    // Suggest a title or just leave blank for admin to fill
  }
  
  modal.classList.add('open');
}

document.getElementById('convert-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgId = document.getElementById('convert-msg-id').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;

  // 1. Create assigned project
  const payload = {
    user_id:       document.getElementById('convert-user').value,
    title:         document.getElementById('convert-title').value.trim(),
    mobile_number: document.getElementById('convert-mobile').value.trim(),
    price:         parseFloat(document.getElementById('convert-price').value) || null,
    message:       "Converted from contact request.",
    status:        "pending"
  };

  const { error: assignError } = await _supabase.from('user_assigned_projects').insert([payload]);
  
  if (assignError) {
    Auth.showToast('Error creating project: ' + assignError.message, 'error');
    btn.disabled = false;
    return;
  }

  // 2. Mark message as completed
  await _supabase.from('messages').update({ status: 'completed' }).eq('id', msgId);

  btn.disabled = false;
  Auth.showToast('Message converted to Assigned Project!', 'success');
  closeModal('convert-modal');
  await loadMessagesAdmin();
  if (document.getElementById('section-assigned').classList.contains('active')) {
    await loadAssignedProjectsAdmin();
  }
});

// ─── Users Admin ──────────────────────────────────────────
async function loadUsersAdmin() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner" style="margin:auto"></div></td></tr>`;

  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px">Error: ${error?.message}</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((u, i) => `
    <tr>
      <td style="color:var(--muted)">${i + 1}</td>
      <td class="td-title">${u.full_name || '—'}</td>
      <td>${u.email}</td>
      <td>
        <span class="badge" style="${u.role === 'admin'
          ? 'background:rgba(201,168,76,0.15);border-color:var(--gold);color:var(--gold)'
          : 'background:rgba(255,255,255,0.05);border-color:var(--border);color:var(--muted-light)'
        }">
          ${u.role === 'admin' ? '⚙ Admin' : '👤 User'}
        </span>
      </td>
      <td>
        <div class="td-actions">
          ${u.role !== 'admin'
            ? `<button class="btn-table-edit" onclick="setUserRole('${u.id}','admin')">Make Admin</button>`
            : `<button class="btn-table-del" onclick="setUserRole('${u.id}','user')">Remove Admin</button>`
          }
        </div>
      </td>
    </tr>`).join('');
}

async function setUserRole(userId, role) {
  const label = role === 'admin' ? 'make this user admin' : 'remove admin role';
  if (!confirm(`Are you sure you want to ${label}?`)) return;
  const { error } = await _supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast(`Role updated to "${role}"`, 'success');
  await loadUsersAdmin();
}

// ─── Assigned Projects Admin ──────────────────────────────
let revenueChartInstance = null;
let statusChartInstance = null;

async function loadAssignedProjectsAdmin() {
  const tbody = document.getElementById('assigned-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner" style="margin:auto"></div></td></tr>`;

  // Fetch assigned projects
  const { data, error } = await _supabase
    .from('user_assigned_projects')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false });

  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px">Error: ${error?.message}</td></tr>`;
    return;
  }
  
  renderAssignedCharts(data);
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px">No assigned projects found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td class="td-title">${p.profiles?.full_name || 'User'}<br><small style="color:var(--muted)">${p.profiles?.email}</small></td>
      <td>${p.title}</td>
      <td>${p.mobile_number}</td>
      <td class="td-gold">${p.price ? '$' + Number(p.price).toLocaleString() : '—'}</td>
      <td>
        <select class="form-input" style="width:auto; padding:4px 8px; font-size:0.85rem;" onchange="updateAssignedStatus('${p.id}', this.value)">
          <option value="pending" ${p.status==='pending'?'selected':''}>Pending</option>
          <option value="completed" ${p.status==='completed'?'selected':''}>Completed</option>
          <option value="canceled" ${p.status==='canceled'?'selected':''}>Canceled</option>
        </select>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn-table-del" onclick="deleteAssignedProject('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderAssignedCharts(data) {
  const revCanvas = document.getElementById('revenueChart');
  const statCanvas = document.getElementById('statusChart');
  if (!revCanvas || !statCanvas || typeof Chart === 'undefined') return;

  // Calculate stats
  let totalRevenue = 0;
  let statusCounts = { pending: 0, completed: 0, canceled: 0 };
  
  data.forEach(p => {
    statusCounts[p.status || 'pending']++;
    if (p.status === 'completed' && p.price) {
      totalRevenue += Number(p.price);
    }
  });

  // Revenue Bar Chart (showing just a big bar for total, or we could show by month, but let's keep it simple)
  if (revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance = new Chart(revCanvas, {
    type: 'bar',
    data: {
      labels: ['Total Revenue'],
      datasets: [{
        label: 'Revenue ($)',
        data: [totalRevenue],
        backgroundColor: '#c9a84c',
        borderRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
  });

  // Status Doughnut Chart
  if (statusChartInstance) statusChartInstance.destroy();
  statusChartInstance = new Chart(statCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Completed', 'Canceled'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.completed, statusCounts.canceled],
        backgroundColor: ['#bbbbb5', '#c9a84c', '#e05555'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

async function updateAssignedStatus(id, newStatus) {
  const { error } = await _supabase.from('user_assigned_projects').update({ status: newStatus }).eq('id', id);
  if (error) Auth.showToast('Error: ' + error.message, 'error');
  else {
    Auth.showToast('Project status updated', 'success');
    await loadAssignedProjectsAdmin();
  }
}

async function openAssignModal() {
  const modal = document.getElementById('assign-modal');
  const userSelect = document.getElementById('assign-user');
  document.getElementById('assign-form').reset();
  
  // Load users into select
  userSelect.innerHTML = '<option value="">Loading...</option>';
  const { data } = await _supabase.from('profiles').select('id, email, full_name');
  if (data) {
    userSelect.innerHTML = '<option value="">-- Select a User --</option>' + 
      data.map(u => `<option value="${u.id}">${u.full_name || 'User'} (${u.email})</option>`).join('');
  }
  
  modal.classList.add('open');
}

document.getElementById('assign-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;

  const payload = {
    user_id:       document.getElementById('assign-user').value,
    title:         document.getElementById('assign-title').value.trim(),
    mobile_number: document.getElementById('assign-mobile').value.trim(),
    price:         parseFloat(document.getElementById('assign-price').value) || null,
    message:       document.getElementById('assign-message').value.trim()
  };

  // Insert assignment (allowing multiple projects per user)
  const { error } = await _supabase
    .from('user_assigned_projects')
    .insert([payload]);

  btn.disabled = false;
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast('Project assigned successfully!', 'success');
  closeModal('assign-modal');
  await loadAssignedProjectsAdmin();
});

async function deleteAssignedProject(id) {
  if (!confirm('Remove this assigned project?')) return;
  const { error } = await _supabase.from('user_assigned_projects').delete().eq('id', id);
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast('Assignment removed.', 'info');
  await loadAssignedProjectsAdmin();
}

// ─── Clients CRM Admin ────────────────────────────────────
async function loadClientsAdmin() {
  const tbody = document.getElementById('clients-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner" style="margin:auto"></div></td></tr>`;

  const { data, error } = await _supabase.from('clients_crm').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px">Error: ${error?.message}</td></tr>`;
    return;
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px">No outreach clients found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(c => {
    let instaLink = c.instagram;
    if (instaLink && !instaLink.startsWith('http')) {
      instaLink = `https://instagram.com/${instaLink.replace('@','')}`;
    }
    
    let statusColor = '#bbbbb5';
    if (c.status === 'completed') statusColor = 'var(--gold)';
    if (c.status === 'canceled') statusColor = '#e05555';
    if (c.status === 'pending') statusColor = '#c9a84c';

    return `
    <tr>
      <td class="td-title">${c.full_name}</td>
      <td>
        ${c.instagram ? `<a href="${instaLink}" target="_blank" style="color:var(--gold); display:inline-flex; align-items:center; gap:6px;">
          <span style="font-size:1.1rem">📸</span> ${c.instagram.startsWith('@') ? c.instagram : '@'+c.instagram.split('/').pop()}
        </a>` : '—'}
      </td>
      <td>${c.phone || '—'}</td>
      <td>
        <select class="form-input" style="width:auto; padding:4px 8px; font-size:0.85rem; border-color:${statusColor}" onchange="updateClientStatus('${c.id}', this.value)">
          <option value="contacted" ${c.status==='contacted'?'selected':''}>Contacted</option>
          <option value="pending" ${c.status==='pending'?'selected':''}>Pending</option>
          <option value="completed" ${c.status==='completed'?'selected':''}>Completed</option>
          <option value="canceled" ${c.status==='canceled'?'selected':''}>Canceled</option>
        </select>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn-table-edit" onclick="openClientModal('${c.id}')">Edit</button>
          <button class="btn-table-del" onclick="deleteClient('${c.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openClientModal(id = null) {
  currentEditId = id;
  const modal = document.getElementById('client-modal');
  const title = document.getElementById('modal-client-title');
  const form  = document.getElementById('client-form');
  form.reset();
  document.getElementById('modal-client-id').value = id || '';

  if (id) {
    title.textContent = 'Edit Client Outreach';
    _supabase.from('clients_crm').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return;
      document.getElementById('client-name').value  = data.full_name || '';
      document.getElementById('client-insta').value = data.instagram || '';
      document.getElementById('client-phone').value = data.phone || '';
      document.getElementById('client-notes').value = data.notes || '';
    });
  } else {
    title.textContent = 'Add Outreach Client';
  }
  modal.classList.add('open');
}

document.getElementById('client-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('modal-client-id').value;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;

  const payload = {
    full_name: document.getElementById('client-name').value.trim(),
    instagram: document.getElementById('client-insta').value.trim(),
    phone:     document.getElementById('client-phone').value.trim(),
    notes:     document.getElementById('client-notes').value.trim()
  };

  const { error } = id
    ? await _supabase.from('clients_crm').update(payload).eq('id', id)
    : await _supabase.from('clients_crm').insert([payload]);

  btn.disabled = false;
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast(id ? 'Client updated!' : 'Client added!', 'success');
  closeModal('client-modal');
  await loadClientsAdmin();
});

async function updateClientStatus(id, newStatus) {
  const { error } = await _supabase.from('clients_crm').update({ status: newStatus }).eq('id', id);
  if (error) Auth.showToast('Error: ' + error.message, 'error');
  else {
    Auth.showToast('Status updated', 'success');
    await loadClientsAdmin();
  }
}

async function deleteClient(id) {
  if (!confirm('Remove this client from CRM?')) return;
  const { error } = await _supabase.from('clients_crm').delete().eq('id', id);
  if (error) { Auth.showToast('Error: ' + error.message, 'error'); return; }
  Auth.showToast('Client removed.', 'info');
  await loadClientsAdmin();
}

// ─── Modal helpers ────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function setupSidebar() {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('open'));
  });
}

// Expose globals for inline onclick
window.openProjectModal = openProjectModal;
window.deleteProject    = deleteProject;
window.closeModal       = closeModal;
window.setUserRole      = setUserRole;
window.openAssignModal  = openAssignModal;
window.deleteAssignedProject = deleteAssignedProject;
window.updateMessageStatus = updateMessageStatus;
window.openConvertModal = openConvertModal;
window.updateAssignedStatus = updateAssignedStatus;
window.openClientModal = openClientModal;
window.updateClientStatus = updateClientStatus;
window.deleteClient = deleteClient;
