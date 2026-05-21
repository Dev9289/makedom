// ============================================================
//  Home Page Module
// ============================================================

// ─── Scroll reveal ───────────────────────────────────────
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Navbar scroll ────────────────────────────────────────
function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  const ham = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  const close = document.querySelector('.mobile-close');
  if (ham && menu) {
    ham.addEventListener('click', () => { ham.classList.toggle('open'); menu.classList.toggle('open'); });
    close?.addEventListener('click', () => { ham.classList.remove('open'); menu.classList.remove('open'); });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { ham.classList.remove('open'); menu.classList.remove('open'); }));
  }

  // Logout
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', Auth.logout);
}

// ─── Stats Count-up ──────────────────────────────────────
function animateCount(el, target, duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target) + (el.dataset.suffix || '+');
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

async function loadStats() {
  const { data, error } = await _supabase.from('site_stats').select('*').eq('id', 1).single();
  if (error || !data) return;

  const map = {
    'stat-websites': data.websites_completed,
    'stat-projects': data.projects_delivered,
    'stat-clients':  data.happy_clients,
    'stat-years':    data.years_experience,
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCount(el, val);
      });
      observer.disconnect();
    }
  }, { threshold: 0.3 });

  const statsBar = document.querySelector('.stats-bar');
  if (statsBar) observer.observe(statsBar);
}

// ─── Featured Projects ────────────────────────────────────
function buildProjectCard(p) {
  const techs = (p.technologies || []).slice(0, 3).map(t => `<span class="badge">${t}</span>`).join('');
  const price  = p.price ? `$${Number(p.price).toLocaleString()}` : 'Custom';
  const externalLink = p.project_url ? `<a href="${p.project_url}" target="_blank" class="btn btn-outline btn-sm">Website ↗</a>` : '';
  
  return `
    <div class="project-card reveal">
      <div class="project-img">
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'}"
             alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'">
        <div class="project-img-overlay"></div>
      </div>
      <div class="project-body">
        <div class="project-tags">${techs}</div>
        <div class="project-title">${p.title}</div>
        <div class="project-desc">${p.description || ''}</div>
      </div>
      <div class="project-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <span class="project-price">${price}</span>
        <div style="display:flex; gap:8px;">
          ${externalLink}
          <a href="projects.html" class="btn btn-outline btn-sm" style="border-color:transparent">View More →</a>
        </div>
      </div>
    </div>`;
}

async function loadFeaturedProjects() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  const { data, error } = await _supabase
    .from('projects')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data?.length) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px">Projects coming soon…</p>';
    return;
  }
  grid.innerHTML = data.map(buildProjectCard).join('');
  initReveal();
}

// ─── Floating Tech Icons ──────────────────────────────────
const TECH_ICONS = [
  { icon: '⚛️', name: 'React', ring: 2, angle: 0 },
  { icon: '🟨', name: 'JavaScript', ring: 2, angle: 60 },
  { icon: '🐍', name: 'Node.js', ring: 2, angle: 120 },
  { icon: '🎨', name: 'CSS3', ring: 2, angle: 180 },
  { icon: '🗄️', name: 'Supabase', ring: 2, angle: 240 },
  { icon: '🔷', name: 'TypeScript', ring: 2, angle: 300 },
  { icon: '🌐', name: 'HTML5', ring: 3, angle: 0 },
  { icon: '▲', name: 'Next.js', ring: 3, angle: 45 },
  { icon: '📦', name: 'PostgreSQL', ring: 3, angle: 90 },
  { icon: '🐳', name: 'Docker', ring: 3, angle: 135 },
  { icon: '🔥', name: 'Firebase', ring: 3, angle: 180 },
  { icon: '🎯', name: 'Figma', ring: 3, angle: 225 },
  { icon: '⚡', name: 'Vite', ring: 3, angle: 270 },
  { icon: '🤖', name: 'AI/ML', ring: 3, angle: 315 },
];

function buildTechIcons() {
  const orbit = document.getElementById('tech-orbit');
  if (!orbit) return;

  const radii = { 2: 170, 3: 240 };
  // For mobile
  const isMobile = window.innerWidth < 600;
  const mobileRadii = { 2: 110, 3: 150 };

  TECH_ICONS.forEach(t => {
    const r = isMobile ? mobileRadii[t.ring] : radii[t.ring];
    const rad = (t.angle * Math.PI) / 180;
    const cx = 50 + (r / (isMobile ? 160 : 260)) * 50 * Math.cos(rad);
    const cy = 50 + (r / (isMobile ? 160 : 260)) * 50 * Math.sin(rad);

    const el = document.createElement('div');
    el.className = 'tech-icon';
    el.style.cssText = `left:${cx}%;top:${cy}%;transform:translate(-50%,-50%);`;
    el.innerHTML = `${t.icon}<span class="tip">${t.name}</span>`;
    // floating animation offset
    el.style.animation = `float-${t.ring} ${3 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`;
    orbit.appendChild(el);
  });

  // Inject float keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float-2 { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-8px)} }
    @keyframes float-3 { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-6px)} }
  `;
  document.head.appendChild(style);
}

// ─── Parallax ─────────────────────────────────────────────
function initParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const bg = hero.querySelector('.hero-bg');
    if (bg) bg.style.transform = `translateY(${y * 0.4}px)`;
  }, { passive: true });
}

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  buildTechIcons();
  initReveal();
  initParallax();
  await Auth.init();
  await loadStats();
  await loadFeaturedProjects();
  initReveal(); // re-run after dynamic content
});
