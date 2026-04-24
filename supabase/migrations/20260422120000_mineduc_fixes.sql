/*
  # Mineduc / MiFuturo — ajustes post-import

  1) Corregir aranceles/costos guardados en UF (valores < 10.000) → CLP (x 40.000).
  2) Agregar career_employability.career_generic_id + FK + backfill por
     (area, tipo_institucion, nombre_carrera_generica) exactos, con fallback
     por similaridad (pg_trgm).
  3) Backfill de programs.career_generic_id nulos usando similaridad de nombres.

  Idempotente: se puede correr varias veces sin efecto duplicado.
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ══════════════════════════════════════════════════════════════
-- 1. UF → CLP en programs (heurística: valor > 0 y < 10.000 = UF)
-- ══════════════════════════════════════════════════════════════
UPDATE programs
   SET arancel_anual = arancel_anual * 40000
 WHERE dataset_version = 'OFE_2026'
   AND arancel_anual IS NOT NULL
   AND arancel_anual > 0
   AND arancel_anual < 10000;

UPDATE programs
   SET matricula_anual = matricula_anual * 40000
 WHERE dataset_version = 'OFE_2026'
   AND matricula_anual IS NOT NULL
   AND matricula_anual > 0
   AND matricula_anual < 10000;

UPDATE programs
   SET costo_titulacion = costo_titulacion * 40000
 WHERE dataset_version = 'OFE_2026'
   AND costo_titulacion IS NOT NULL
   AND costo_titulacion > 0
   AND costo_titulacion < 10000;

UPDATE programs
   SET costo_certificado_diploma = costo_certificado_diploma * 40000
 WHERE dataset_version = 'OFE_2026'
   AND costo_certificado_diploma IS NOT NULL
   AND costo_certificado_diploma > 0
   AND costo_certificado_diploma < 10000;

-- ══════════════════════════════════════════════════════════════
-- 2. career_employability.career_generic_id  (FK real)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE career_employability
  ADD COLUMN IF NOT EXISTS career_generic_id uuid
  REFERENCES career_generic(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emp_generic_id
  ON career_employability (career_generic_id);

-- Backfill exacto por (area, tipo_institucion, nombre_carrera_generica)
UPDATE career_employability e
   SET career_generic_id = cg.id
  FROM career_generic cg
 WHERE e.career_generic_id IS NULL
   AND e.area = cg.area
   AND e.tipo_institucion = cg.tipo_institucion
   AND e.nombre_carrera_generica = cg.nombre_carrera_generica;

-- Fallback por similaridad dentro del mismo tipo de institución
UPDATE career_employability e
   SET career_generic_id = sub.id
  FROM (
    SELECT DISTINCT ON (e2.id)
           e2.id       AS emp_id,
           cg.id       AS id
      FROM career_employability e2
      JOIN career_generic cg
        ON cg.tipo_institucion = e2.tipo_institucion
     WHERE e2.career_generic_id IS NULL
       AND e2.nombre_carrera_generica IS NOT NULL
       AND similarity(cg.nombre_carrera_generica, e2.nombre_carrera_generica) > 0.55
     ORDER BY e2.id, similarity(cg.nombre_carrera_generica, e2.nombre_carrera_generica) DESC
  ) sub
 WHERE e.id = sub.emp_id;

-- ══════════════════════════════════════════════════════════════
-- 3. Backfill programs.career_generic_id nulos
--    Estrategia: similaridad por (tipo_institucion + nombre genérica)
-- ══════════════════════════════════════════════════════════════
UPDATE programs p
   SET career_generic_id = sub.id
  FROM (
    SELECT DISTINCT ON (p2.program_unique_code, p2.dataset_version)
           p2.program_unique_code,
           p2.dataset_version,
           cg.id
      FROM programs p2
      JOIN career_generic cg
        ON cg.tipo_institucion = p2.tipo_institucion
     WHERE p2.career_generic_id IS NULL
       AND p2.area_carrera_generica IS NOT NULL
       AND similarity(cg.nombre_carrera_generica, p2.area_carrera_generica) > 0.55
     ORDER BY p2.program_unique_code,
              p2.dataset_version,
              similarity(cg.nombre_carrera_generica, p2.area_carrera_generica) DESC
  ) sub
 WHERE p.program_unique_code = sub.program_unique_code
   AND p.dataset_version    = sub.dataset_version;
