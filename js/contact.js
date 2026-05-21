// ============================================================
//  Contact Page Module
// ============================================================

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

function validatePhone(phone) {
  return /^\+?[\d\s\-()]{7,}$/.test(phone.trim());
}

async function initContactForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.form-error-msg').forEach(el => el.textContent = '');

    const full_name = document.getElementById('contact-name').value.trim();
    const phone     = document.getElementById('contact-phone').value.trim();
    const request   = document.getElementById('contact-request').value.trim();

    let valid = true;

    if (!full_name) {
      document.getElementById('contact-name').classList.add('error');
      document.getElementById('err-name').textContent = 'Please enter your full name.';
      valid = false;
    }
    if (!validatePhone(phone)) {
      document.getElementById('contact-phone').classList.add('error');
      document.getElementById('err-phone').textContent = 'Please enter a valid phone number.';
      valid = false;
    }
    if (request.length < 10) {
      document.getElementById('contact-request').classList.add('error');
      document.getElementById('err-request').textContent = 'Please describe your project (min 10 chars).';
      valid = false;
    }
    if (!valid) return;

    const btn = form.querySelector('.submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Sending…';

    const { error } = await _supabase.from('messages').insert([{ full_name, phone, request }]);

    btn.disabled = false;
    btn.innerHTML = 'Send Message ✦';

    if (error) {
      Auth.showToast('Failed to send. Please try again.', 'error');
      console.error(error);
    } else {
      form.style.display = 'none';
      success.classList.add('show');
    }
  });

  // Real-time validation feedback
  form.querySelectorAll('.form-input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.classList.remove('error');
      const errId = inp.dataset.err;
      if (errId) document.getElementById(errId).textContent = '';
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  await Auth.init();
  await initContactForm();

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
