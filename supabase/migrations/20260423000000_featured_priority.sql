-- ══════════════════════════════════════════════════════════════
-- Monetización: destacar instituciones y programas (featured)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS priority    integer NOT NULL DEFAULT 0;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS featured_until timestamptz;

ALTER TABLE programs     ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE programs     ADD COLUMN IF NOT EXISTS priority    integer NOT NULL DEFAULT 0;
ALTER TABLE programs     ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_institutions_featured ON institutions (is_featured, priority DESC);
CREATE INDEX IF NOT EXISTS idx_programs_featured     ON programs     (is_featured, priority DESC) WHERE is_current = true;
