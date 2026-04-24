/*
  # Hardening de seguridad y relaciones (Fase 3)

  1. RLS en `rate_limits`:
     - La tabla hoy no tiene RLS. Cualquier cliente con anon key podía hacer
       DELETE FROM rate_limits o insertar registros falsos.
     - Habilitamos RLS + política solo para service_role.

  2. `career_employability.career_generic_id`:
     - Hoy existe `institution_code` (FK a institutions) pero el enlace por
       carrera genérica se hace por string ILIKE (`nombre_carrera_generica`).
     - Agregamos la columna + FK y backfill por match exacto de
       (area, tipo_institucion, nombre_carrera_generica).
     - Seguimos permitiendo que sea NULL para filas sin match seguro.

  3. Índice compuesto para queries tipo "empleabilidad de X en institución Y":
     idx_emp_inst_generic (institution_code, career_generic_id).
*/

-- ══════════════════════════════════════════════════════════════
-- 1. RLS en rate_limits
-- ══════════════════════════════════════════════════════════════
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Solo el service_role puede leer/escribir esta tabla.
-- El endpoint /api/discover ya usa service_role para verificarla.
DROP POLICY IF EXISTS "service manages rate_limits" ON rate_limits;
CREATE POLICY "service manages rate_limits" ON rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Nota: no damos acceso a anon/authenticated. Si el día de mañana quieres
-- que un admin lo vea vía dashboard, agrega una policy específica para ese
-- rol (no para anon).

-- ══════════════════════════════════════════════════════════════
-- 2. career_employability.career_generic_id (FK formal)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE career_employability
  ADD COLUMN IF NOT EXISTS career_generic_id uuid
  REFERENCES career_generic(id) ON DELETE SET NULL;

-- Backfill: match exacto por (area, tipo_institucion, nombre_carrera_generica).
-- Este es el tuple UNIQUE de career_generic, así que el match es 1:1 cuando existe.
UPDATE career_employability ce
   SET career_generic_id = cg.id
  FROM career_generic cg
 WHERE ce.career_generic_id IS NULL
   AND cg.area = ce.area
   AND cg.tipo_institucion = ce.tipo_institucion
   AND cg.nombre_carrera_generica = ce.nombre_carrera_generica;

-- ══════════════════════════════════════════════════════════════
-- 3. Índice compuesto para lookups por institución + carrera
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_emp_inst_generic
  ON career_employability (institution_code, career_generic_id);

-- ══════════════════════════════════════════════════════════════
-- 4. Comentarios útiles para auditorías futuras
-- ══════════════════════════════════════════════════════════════
COMMENT ON COLUMN career_employability.career_generic_id IS
  'FK a career_generic. Backfilled por match exacto (area, tipo_institucion, nombre_carrera_generica). NULL cuando no hay match 1:1.';
