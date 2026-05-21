-- ============================================================
--  MakeUrWebsite — Supabase PostgreSQL Schema
--  Copy and paste this ENTIRE file into:
--  Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ─────────────────────────────────────────────
--  0. USER PROFILES (with role system)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  role        TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row whenever a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all profiles (needed for admin panel)
DROP POLICY IF EXISTS "profiles_auth_read" ON public.profiles;
CREATE POLICY "profiles_auth_read" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile (but not role — role is admin-only via Supabase dashboard)
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────
--  HOW TO MAKE YOURSELF ADMIN:
--  After registering on the site, run this in SQL Editor:
--  UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
--  1. PROJECTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT          NOT NULL,
  description   TEXT,
  technologies  TEXT[]        DEFAULT '{}',
  price         NUMERIC(10,2),
  image_url     TEXT,
  project_url   TEXT,
  featured      BOOLEAN       NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- If the table already exists from previous steps, we add columns safely:
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────────
--  2. CONTACT MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  request     TEXT        NOT NULL,
  status      TEXT        DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ─────────────────────────────────────────────
--  3. SITE STATS (single row, id = 1)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_stats (
  id                   INT         PRIMARY KEY DEFAULT 1,
  websites_completed   INT         NOT NULL DEFAULT 0,
  projects_delivered   INT         NOT NULL DEFAULT 0,
  happy_clients        INT         NOT NULL DEFAULT 0,
  years_experience     INT         NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the single stats row if it doesn't exist
INSERT INTO public.site_stats (id, websites_completed, projects_delivered, happy_clients, years_experience)
VALUES (1, 120, 95, 87, 5)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
--  4. USER ASSIGNED PROJECTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_assigned_projects (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  mobile_number  TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  price          NUMERIC(10,2),
  status         TEXT        DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_assigned_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.user_assigned_projects DROP CONSTRAINT IF EXISTS user_assigned_projects_user_id_key;

-- ─────────────────────────────────────────────
--  5. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assigned_projects ENABLE ROW LEVEL SECURITY;

-- ── projects: public read (if is_public), admin can do everything ──
DROP POLICY IF EXISTS "projects_public_read" ON public.projects;
CREATE POLICY "projects_public_read" ON public.projects
  FOR SELECT USING (
    is_public = true 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "projects_auth_write" ON public.projects;
CREATE POLICY "projects_auth_write" ON public.projects
  FOR ALL USING (auth.role() = 'authenticated');

-- ── messages: anyone can insert, only authenticated can read ──
DROP POLICY IF EXISTS "messages_anon_insert" ON public.messages;
CREATE POLICY "messages_anon_insert" ON public.messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "messages_auth_read" ON public.messages;
CREATE POLICY "messages_auth_read" ON public.messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── site_stats: public read, authenticated write ──
DROP POLICY IF EXISTS "stats_public_read" ON public.site_stats;
CREATE POLICY "stats_public_read" ON public.site_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "stats_auth_write" ON public.site_stats;
CREATE POLICY "stats_auth_write" ON public.site_stats
  FOR ALL USING (auth.role() = 'authenticated');

-- ── user_assigned_projects: user can read own, auth (admins) can write ──
DROP POLICY IF EXISTS "assigned_projects_user_read" ON public.user_assigned_projects;
CREATE POLICY "assigned_projects_user_read" ON public.user_assigned_projects
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "assigned_projects_auth_write" ON public.user_assigned_projects;
CREATE POLICY "assigned_projects_auth_write" ON public.user_assigned_projects
  FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
--  6. SAMPLE PROJECT DATA (optional)
-- ─────────────────────────────────────────────
INSERT INTO public.projects (title, description, technologies, price, image_url, featured)
VALUES
  (
    'LuxeBoutique E-Commerce',
    'A high-end fashion e-commerce store with real-time inventory, Stripe payments, and an elegant product showcase.',
    ARRAY['React', 'Node.js', 'Stripe', 'PostgreSQL'],
    2499.00,
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800',
    true
  ),
  (
    'TechFlow SaaS Dashboard',
    'A complex analytics dashboard with real-time data visualization, multi-tenant auth, and export features.',
    ARRAY['Next.js', 'Supabase', 'Chart.js', 'TypeScript'],
    3800.00,
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    true
  ),
  (
    'RestaurantPro Booking System',
    'Full-stack reservation management platform with table management, SMS notifications, and admin panel.',
    ARRAY['Vue.js', 'Express', 'Twilio', 'MySQL'],
    1799.00,
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    true
  ),
  (
    'HealthTrack Mobile Web App',
    'Progressive web app for fitness tracking with workout logging, nutrition charts, and social sharing.',
    ARRAY['React', 'Firebase', 'PWA', 'Tailwind'],
    2100.00,
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
    false
  ),
  (
    'RealEstate Pro Platform',
    'Property listing and management platform with map integration, virtual tours, and lead capture.',
    ARRAY['Next.js', 'Mapbox', 'Supabase', 'Framer Motion'],
    4200.00,
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
    false
  ),
  (
    'CreativeAgency Portfolio',
    'Award-winning creative agency portfolio with GSAP animations, case studies, and client testimonials.',
    ARRAY['HTML', 'GSAP', 'CSS', 'JavaScript'],
    950.00,
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800',
    false
  );

-- ─────────────────────────────────────────────
--  7. STORAGE FOR IMAGES
-- ─────────────────────────────────────────────
-- Create the project-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS is already enabled by default on storage.objects by Supabase.

-- Allow public read access to the project-images bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

-- Allow authenticated users (Admins) to upload images
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'project-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
CREATE POLICY "Admin Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
CREATE POLICY "Admin Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
--  8. CLIENTS CRM
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients_crm (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT        NOT NULL,
  instagram      TEXT,
  phone          TEXT,
  status         TEXT        DEFAULT 'contacted', -- contacted, pending, canceled, completed
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients_crm ENABLE ROW LEVEL SECURITY;

-- Only admins can manage clients CRM
DROP POLICY IF EXISTS "Admins manage clients_crm" ON public.clients_crm;
CREATE POLICY "Admins manage clients_crm" ON public.clients_crm
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
--  DONE! All tables created and sample data inserted.
--  You can now run your MakeUrWebsite application.
-- ============================================================
