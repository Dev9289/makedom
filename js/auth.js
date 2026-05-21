// ============================================================
//  Auth Module — Login, Register, Session Management
// ============================================================

const Auth = (() => {

  // ── Toast helper ────────────────────────────────────────
  function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✦', error: '✗', info: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ── Auth state listener (run on every page) ──────────────
  async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    updateNavAuth(session?.user || null);

    _supabase.auth.onAuthStateChange((_event, session) => {
      updateNavAuth(session?.user || null);
    });
  }

  async function updateNavAuth(user) {
    const authLink = document.getElementById('nav-auth-link');
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (!authLink) return;
    if (user) {
      const admin = await isAdmin();
      authLink.textContent = admin ? 'Admin Panel' : 'My Account';
      authLink.href = admin ? 'admin.html' : 'account.html';
      if (logoutBtn) { logoutBtn.style.display = 'flex'; }
    } else {
      authLink.textContent = 'Login';
      authLink.href = 'auth.html';
      if (logoutBtn) { logoutBtn.style.display = 'none'; }
    }
  }

  async function logout() {
    await _supabase.auth.signOut();
    showToast('Logged out successfully', 'info');
    setTimeout(() => window.location.href = 'index.html', 800);
  }

  // ── Guard: redirect if not admin (checks DB role) ──────────
  async function requireAdmin() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = 'auth.html'; return null; }
    const { data: profile } = await _supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profile?.role !== 'admin') {
      window.location.href = 'auth.html';
      return null;
    }
    return session.user;
  }

  // ── Auth page logic ──────────────────────────────────────
  function initAuthPage() {
    const loginTab    = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm   = document.getElementById('form-login');
    const registerForm= document.getElementById('form-register');

    function setTab(tab) {
      loginTab.classList.toggle('active', tab === 'login');
      registerTab.classList.toggle('active', tab === 'register');
      loginForm.classList.toggle('active', tab === 'login');
      registerForm.classList.toggle('active', tab === 'register');
    }
    loginTab.addEventListener('click', () => setTab('login'));
    registerTab.addEventListener('click', () => setTab('register'));

    // Toggle links in form text
    document.querySelectorAll('[data-switch]').forEach(el => {
      el.addEventListener('click', () => setTab(el.dataset.switch));
    });

    // ── Login ──
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('login-error');
      errBox.classList.remove('show');
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Signing in…';

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const { data: signInData, error } = await _supabase.auth.signInWithPassword({ email, password });
      btn.disabled = false; btn.textContent = 'Sign In';
      if (error) {
        errBox.textContent = error.message;
        errBox.classList.add('show');
      } else {
        showToast('Welcome back! 🎉', 'success');
        // Check DB role to decide redirect
        const { data: profile } = await _supabase
          .from('profiles').select('role').eq('id', signInData.user.id).single();
        setTimeout(() => {
          window.location.href = profile?.role === 'admin' ? 'admin.html' : 'index.html';
        }, 600);
      }
    });

    // ── Register ──
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('register-error');
      const sucBox = document.getElementById('register-success');
      errBox.classList.remove('show'); sucBox.classList.remove('show');

      const btn = e.target.querySelector('button[type=submit]');
      const name     = document.getElementById('register-name').value.trim();
      const email    = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirm  = document.getElementById('register-confirm').value;

      if (password !== confirm) {
        errBox.textContent = 'Passwords do not match.';
        errBox.classList.add('show');
        return;
      }
      if (password.length < 8) {
        errBox.textContent = 'Password must be at least 8 characters.';
        errBox.classList.add('show');
        return;
      }
      btn.disabled = true; btn.textContent = 'Creating account…';

      // Sign up (email confirmation disabled in Supabase Dashboard)
      const { error: signUpError } = await _supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });
      if (signUpError) {
        btn.disabled = false; btn.textContent = 'Create Account';
        errBox.textContent = signUpError.message;
        errBox.classList.add('show');
        return;
      }
      // Auto sign-in immediately after signup
      const { data: signInData, error: loginError } = await _supabase.auth.signInWithPassword({ email, password });
      btn.disabled = false; btn.textContent = 'Create Account';
      if (loginError) {
        sucBox.textContent = '✓ Account created! You can now sign in.';
        sucBox.classList.add('show');
        e.target.reset();
      } else {
        showToast('Account created! Welcome 🎉', 'success');
        const { data: profile } = await _supabase
          .from('profiles').select('role').eq('id', signInData.user.id).single();
        setTimeout(() => {
          window.location.href = profile?.role === 'admin' ? 'admin.html' : 'index.html';
        }, 600);
      }
    });

    // Password visibility toggles
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = btn.previousElementSibling;
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.textContent = show ? '🙈' : '👁';
      });
    });
  }

  return { init, logout, requireAdmin, showToast, initAuthPage };
})();
