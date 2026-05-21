// ============================================================
//  Projects Page Module
// ============================================================

let allProjects = [];
let activeFilter = 'all';

function buildProjCard(p) {
  const techs = (p.technologies || []).map(t => `<span class="badge">${t}</span>`).join('');
  const price  = p.price ? `$${Number(p.price).toLocaleString()}` : 'Custom';
  const img    = p.image_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800';
  const linkHtml = p.project_url ? `<a href="${p.project_url}" target="_blank" class="btn btn-outline btn-sm" style="margin-top: 16px; width: 100%; justify-content: center;">Visit Website ↗</a>` : '';
  
  return `
    <div class="proj-card reveal" data-techs="${(p.technologies||[]).join(',')}">
      <div class="proj-card-img">
        <img src="${img}" alt="${p.title}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'">
        <div class="proj-img-overlay"></div>
        <span class="proj-price-badge">${price}</span>
      </div>
      <div class="proj-card-body">
        <div class="proj-card-title">${p.title}</div>
        <div class="proj-card-desc">${p.description || ''}</div>
        <div class="proj-card-techs">${techs}</div>
        ${linkHtml}
      </div>
    </div>`;
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const filtered = activeFilter === 'all'
    ? allProjects
    : allProjects.filter(p => (p.technologies || []).some(t => t.toLowerCase() === activeFilter));

  if (!filtered.length) {
    grid.innerHTML = `<div class="no-results"><h3>No projects found</h3><p>Try a different filter.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(buildProjCard).join('');

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function buildFilters() {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  const techSet = new Set();
  allProjects.forEach(p => (p.technologies || []).forEach(t => techSet.add(t)));
  const techs = [...techSet].sort();

  bar.innerHTML = `<button class="filter-btn active" data-filter="all">All Projects</button>` +
    techs.map(t => `<button class="filter-btn" data-filter="${t.toLowerCase()}">${t}</button>`).join('');

  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderProjects();
    });
  });
}

async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  if (grid) grid.innerHTML = `<div class="loading-center" style="grid-column:1/-1"><div class="spinner"></div><span>Loading projects…</span></div>`;

  const { data, error } = await _supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (grid) grid.innerHTML = `<div class="no-results"><h3>Failed to load projects</h3><p>${error.message}</p></div>`;
    return;
  }
  allProjects = data || [];
  buildFilters();
  renderProjects();
}

// Navbar & init
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const ham = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  const close = document.querySelector('.mobile-close');
  if (ham && menu) {
    ham.addEventListener('click', () => { ham.classList.toggle('open'); menu.classList.toggle('open'); });
    close?.addEventListener('click', () => { ham.classList.remove('open'); menu.classList.remove('open'); });
  }
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', Auth.logout);
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  await Auth.init();
  await loadProjects();
});
