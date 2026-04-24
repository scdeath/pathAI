-- ────────────────────────────────────────────
-- Permitir guardar PROGRAMAS (no solo carreras genéricas) en saved
-- Asocia el "Guardar como favorita" del comparador a la cuenta del usuario.
-- ────────────────────────────────────────────

-- 1) Agregar columna program_unique_code (referencia opcional al programa MINEDUC)
ALTER TABLE saved
  ADD COLUMN IF NOT EXISTS program_unique_code text;

-- 2) Hacer career_id opcional para soportar registros tipo "programa real"
ALTER TABLE saved
  ALTER COLUMN career_id DROP NOT NULL;

-- 3) Asegurar que al menos uno de los dos venga
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_target_required'
  ) THEN
    ALTER TABLE saved
      ADD CONSTRAINT saved_target_required
      CHECK (career_id IS NOT NULL OR program_unique_code IS NOT NULL);
  END IF;
END $$;

-- 4) Índice + unicidad por (user_id, program_unique_code)
CREATE INDEX IF NOT EXISTS idx_saved_program_code ON saved (program_unique_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_user_program_unique'
  ) THEN
    ALTER TABLE saved
      ADD CONSTRAINT saved_user_program_unique
      UNIQUE (user_id, program_unique_code);
  END IF;
END $$;
