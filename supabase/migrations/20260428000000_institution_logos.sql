-- Agrega columna logo_url a institutions
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- Índice para filtrar rápido las que ya tienen logo
CREATE INDEX IF NOT EXISTS idx_institutions_logo_url
  ON institutions (logo_url)
  WHERE logo_url IS NOT NULL;

-- Bucket para logos de instituciones en Supabase Storage
-- (crear manualmente desde dashboard o via API, esto es solo documentación)
-- bucket: institution-logos, público, 5MB max, tipos: image/png image/jpeg image/webp image/svg+xml
