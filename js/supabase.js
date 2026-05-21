// ============================================================
//  Supabase Client Initializer
// ============================================================
// Uses the Supabase CDN client loaded via <script> in HTML.
// config.js must be loaded before this file.

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Convenience: get current session user
async function getCurrentUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await _supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return data?.role === 'admin';
}

// Get current user's profile (includes role)
async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}
