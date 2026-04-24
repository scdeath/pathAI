/*
  # Cache Semántico de Chat

  Guarda (pregunta, respuesta, embedding) para que preguntas similares
  (similitud coseno > threshold) se respondan directamente sin llamar al LLM.

  Ahorro típico: 30-60% de requests en un chat de dominio acotado.

  Estrategia:
    1. Usuario hace pregunta → embed → buscar en chat_cache con match_chat_cache(embedding, 0.93)
    2. Si hit → devolver respuesta cacheada, incrementar hits
    3. Si miss → llamar LLM → guardar (pregunta, respuesta, embedding, tags)
    4. Tag "volatile" en respuestas con datos que cambian (aranceles, puntajes)
       para invalidar con TTL corto.
*/

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chat_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question     text NOT NULL,
  answer       text NOT NULL,
  embedding    vector(384) NOT NULL,
  tags         text[] DEFAULT '{}',        -- ['institution','career','ranking'...]
  hits         integer DEFAULT 0,
  volatile     boolean DEFAULT false,      -- true = datos que cambian, TTL corto
  created_at   timestamptz DEFAULT now(),
  last_hit_at  timestamptz DEFAULT now()
);

ALTER TABLE chat_cache ENABLE ROW LEVEL SECURITY;

-- Solo service_role escribe; lectura pública para debug opcional
DROP POLICY IF EXISTS "service can manage chat_cache" ON chat_cache;
CREATE POLICY "service can manage chat_cache" ON chat_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Índice HNSW para búsqueda por similitud
CREATE INDEX IF NOT EXISTS idx_chat_cache_embedding
  ON chat_cache USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chat_cache_created ON chat_cache (created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- RPC: match_chat_cache
--   Devuelve la entrada más similar si supera el umbral.
--   Aplica TTL: volatile expira en 24h, no-volatile en 30 días.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_chat_cache(
  q_embedding  vector(384),
  min_score    float DEFAULT 0.93
)
RETURNS TABLE (
  id        uuid,
  question  text,
  answer    text,
  score     float,
  hits      integer
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.question,
    c.answer,
    (1 - (c.embedding <=> q_embedding))::float AS score,
    c.hits
  FROM chat_cache c
  WHERE (1 - (c.embedding <=> q_embedding)) >= min_score
    AND (
      (c.volatile = true  AND c.created_at > now() - interval '24 hours')
      OR
      (c.volatile = false AND c.created_at > now() - interval '30 days')
    )
  ORDER BY c.embedding <=> q_embedding
  LIMIT 1;
$$;

-- ══════════════════════════════════════════════════════════════
-- RPC: bump_chat_cache_hit
--   Incrementa contador de hits (métrica) cuando hay cache hit.
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION bump_chat_cache_hit(cache_id uuid)
RETURNS void
LANGUAGE sql AS $$
  UPDATE chat_cache
     SET hits = hits + 1,
         last_hit_at = now()
   WHERE id = cache_id;
$$;

GRANT EXECUTE ON FUNCTION match_chat_cache(vector, float) TO service_role;
GRANT EXECUTE ON FUNCTION bump_chat_cache_hit(uuid) TO service_role;
