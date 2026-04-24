/*
  # Nueva Arquitectura — KoraChile

  ## Tablas creadas
  - `careers`   — fichas de carreras pre-generadas (no se usa IA en cada request)
  - `curricula` — mallas curriculares por institución
  - `users`     — perfil de usuario (extiende auth.users)
  - `saved`     — carreras favoritas del usuario con notas

  ## Lógica
  - Las carreras se generan una sola vez via script admin (scripts/seed-careers.ts)
  - En runtime la API solo lee de estas tablas (sin IA)
  - Solo el endpoint /api/chat usa IA (Groq) en tiempo real
*/

-- ────────────────────────────────────────────
-- 1. CAREERS — fichas pre-generadas
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS careers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  tagline         text,
  description     text,
  emoji           text DEFAULT '🎯',
  category        text,  -- tecnología, salud, negocios, arte, ciencias, derecho, ingeniería, educación
  skills          text[] DEFAULT '{}',
  pros            text[] DEFAULT '{}',
  cons            text[] DEFAULT '{}',
  salary_junior   integer,
  salary_mid      integer,
  salary_senior   integer,
  job_demand      text CHECK (job_demand IN ('Alta', 'Media', 'Muy Alta', 'Baja')),
  personality_types text[] DEFAULT '{}',
  fun_facts       text[] DEFAULT '{}',
  roadmap         jsonb DEFAULT '[]',
  books           jsonb DEFAULT '[]',
  notable_people  jsonb DEFAULT '[]',
  match_keywords  text[] DEFAULT '{}',  -- palabras clave para búsqueda
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read careers" ON careers FOR SELECT TO anon, authenticated USING (true);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_careers_category ON careers (category);
CREATE INDEX IF NOT EXISTS idx_careers_slug ON careers (slug);
CREATE INDEX IF NOT EXISTS idx_careers_keywords ON careers USING GIN (match_keywords);

-- ────────────────────────────────────────────
-- 2. CURRICULA — mallas por institución
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curricula (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id           uuid REFERENCES careers(id) ON DELETE CASCADE,
  institution         text NOT NULL,
  institution_type    text CHECK (institution_type IN ('Universidad', 'Instituto', 'CFT', 'Online')),
  location            text,
  program             text,
  duration_semesters  integer,
  monthly_cost        integer,    -- en CLP
  total_cost          integer,    -- en CLP
  subjects            jsonb DEFAULT '[]',  -- [{semester: 1, subjects: [...]}]
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read curricula" ON curricula FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_curricula_career_id ON curricula (career_id);

-- ────────────────────────────────────────────
-- 3. USERS — perfil (extiende auth.users)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  email       text,
  avatar_url  text,
  interests   text[] DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile"   ON users FOR SELECT    USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE    USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT    WITH CHECK (auth.uid() = id);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────
-- 4. SAVED — favoritas con notas
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  career_id   uuid REFERENCES careers(id) ON DELETE CASCADE NOT NULL,
  notes       text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, career_id)
);

ALTER TABLE saved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own saved"   ON saved FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved" ON saved FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved" ON saved FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own saved" ON saved FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_saved_user_id ON saved (user_id);
