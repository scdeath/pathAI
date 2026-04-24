-- ══════════════════════════════════════════════════════════════
-- Rol de admin en users + catálogo de planes + suscripciones
-- ══════════════════════════════════════════════════════════════

-- 1. Rol de usuario
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
-- Valores esperados: 'user' | 'admin' | 'institution'

-- 2. Catálogo de planes (solo metadata; el estado real vive en institutions.is_featured/priority)
CREATE TABLE IF NOT EXISTS plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  priority     integer NOT NULL DEFAULT 0,
  price_clp    integer NOT NULL DEFAULT 0,
  features     jsonb   NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO plans (slug, name, priority, price_clp, features) VALUES
  ('free',     'Free',     0,   0,       '{"description":"Aparición normal en rankings y búsquedas"}'::jsonb),
  ('featured', 'Featured', 50,  290000,  '{"description":"Destacado en resultados + logo","badge":true}'::jsonb),
  ('premium',  'Premium',  100, 690000,  '{"description":"Top en rankings + destacado + analytics","badge":true,"analytics":true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read plans" ON plans;
CREATE POLICY "public read plans" ON plans FOR SELECT TO anon, authenticated USING (true);

-- 3. Suscripciones de instituciones (historial)
CREATE TABLE IF NOT EXISTS institution_subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_code integer NOT NULL REFERENCES institutions(institution_code) ON DELETE CASCADE,
  plan_slug        text    NOT NULL REFERENCES plans(slug),
  starts_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_subs_institution ON institution_subscriptions (institution_code);
CREATE INDEX IF NOT EXISTS idx_inst_subs_active      ON institution_subscriptions (is_active, expires_at);

ALTER TABLE institution_subscriptions ENABLE ROW LEVEL SECURITY;
-- Solo el backend con service role escribe aquí
DROP POLICY IF EXISTS "public read inst subs" ON institution_subscriptions;
CREATE POLICY "public read inst subs" ON institution_subscriptions FOR SELECT TO anon, authenticated USING (true);
