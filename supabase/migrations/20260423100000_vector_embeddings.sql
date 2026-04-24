/*
  # Vector Embeddings — RAG híbrido

  Agrega columnas embedding (vector 384d) a institutions, career_generic y programs.
  Modelo: paraphrase-multilingual-MiniLM-L12-v2 (384 dimensiones, multilingüe, excelente en español).

  El script scripts/generate-embeddings.ts llena estos vectores.
  La función RPC search_hybrid permite búsqueda semántica + SQL combinada.
*/

-- Habilitar pgvector (Supabase lo incluye por defecto)
CREATE EXTENSION IF NOT EXISTS vector;

-- ══════════════════════════════════════════════════════════════
-- 1. COLUMNAS DE EMBEDDING
-- ══════════════════════════════════════════════════════════════

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS embedding vector(384);

ALTER TABLE career_generic
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- En programs solo indexamos las filas is_current=true (una por programa vigente)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- ══════════════════════════════════════════════════════════════
-- 2. ÍNDICES HNSW (búsqueda aproximada, muy rápida)
-- ══════════════════════════════════════════════════════════════
-- HNSW es preferible a IVFFlat para datasets < 500k filas.

CREATE INDEX IF NOT EXISTS idx_institutions_embedding
  ON institutions USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_career_generic_embedding
  ON career_generic USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_programs_embedding
  ON programs USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ══════════════════════════════════════════════════════════════
-- 3. FUNCIÓN RPC: search_hybrid
--    Busca en las 3 tablas a la vez y devuelve top-K resultados
--    ordenados por similitud coseno. El API la llama con el
--    embedding de la pregunta del usuario.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_hybrid(
  q_embedding  vector(384),
  k            int     DEFAULT 6,
  min_score    float   DEFAULT 0.30
)
RETURNS TABLE (
  kind         text,
  ref_id       text,
  nombre       text,
  score        float,
  payload      jsonb
)
LANGUAGE sql STABLE AS $$
  -- Instituciones
  SELECT
    'institution'::text,
    institution_code::text,
    nombre_institucion,
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'tipo',       tipo_institucion,
      'direccion',  direccion_sede_central,
      'web',        pagina_web,
      'acreditacion_anos', acreditacion_anos,
      'matricula_pregrado', matricula_pregrado_actual,
      'titulados_pregrado', titulados_pregrado_actual,
      'retencion_pct', retencion_1er_ano_pct
    ) AS payload
  FROM institutions
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> q_embedding)) >= min_score

  UNION ALL

  -- Carreras genéricas
  SELECT
    'career'::text,
    id::text,
    nombre_carrera_generica,
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'area',            area,
      'tipo_institucion', tipo_institucion
    ) AS payload
  FROM career_generic
  WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> q_embedding)) >= min_score

  UNION ALL

  -- Programas vigentes
  SELECT
    'program'::text,
    program_unique_code,
    nombre_carrera || ' — ' || COALESCE(nombre_institucion, '') || ' (' || COALESCE(nombre_sede, '') || ')',
    (1 - (embedding <=> q_embedding))::float AS score,
    jsonb_build_object(
      'nombre_carrera',    nombre_carrera,
      'nombre_institucion', nombre_institucion,
      'nombre_sede',       nombre_sede,
      'region',            region,
      'jornada',           jornada,
      'arancel_anual',     arancel_anual,
      'vacantes_semestre_1', vacantes_semestre_1,
      'puntaje_corte_ultimo', puntaje_corte_ultimo
    ) AS payload
  FROM programs
  WHERE embedding IS NOT NULL
    AND is_current = true
    AND (1 - (embedding <=> q_embedding)) >= min_score

  ORDER BY score DESC
  LIMIT k;
$$;

-- Permisos para que anon y authenticated puedan llamar la RPC
GRANT EXECUTE ON FUNCTION search_hybrid(vector, int, float) TO anon, authenticated;
