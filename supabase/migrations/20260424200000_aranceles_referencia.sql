-- Aranceles de referencia MINEDUC 2026
-- Fuente: https://portal.beneficiosestudiantiles.cl/aranceles-de-referencia
-- Valor UF 2026: $39,643.59 CLP
--
-- arancel_referencia_becas:    tope que cubren BES, BJG, BAES, etc.
-- arancel_referencia_creditos: tope que cubre el CAE / FONDO SOLIDARIO
-- brecha_arancel_becas:        diferencia entre arancel real y ref_becas (columna generada)
-- brecha_arancel_creditos:     diferencia entre arancel real y ref_creditos (columna generada)

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS arancel_referencia_becas    integer,
  ADD COLUMN IF NOT EXISTS arancel_referencia_creditos integer;

-- Columnas generadas: brecha que el alumno podría tener que pagar de su bolsillo
-- Solo se calculan cuando ambos valores están disponibles y el real es mayor
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS brecha_arancel_becas integer
    GENERATED ALWAYS AS (
      CASE WHEN arancel_anual IS NOT NULL AND arancel_referencia_becas IS NOT NULL
               AND arancel_anual > arancel_referencia_becas
           THEN arancel_anual - arancel_referencia_becas
           ELSE 0
      END
    ) STORED;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS brecha_arancel_creditos integer
    GENERATED ALWAYS AS (
      CASE WHEN arancel_anual IS NOT NULL AND arancel_referencia_creditos IS NOT NULL
               AND arancel_anual > arancel_referencia_creditos
           THEN arancel_anual - arancel_referencia_creditos
           ELSE 0
      END
    ) STORED;

COMMENT ON COLUMN public.programs.arancel_referencia_becas    IS 'Arancel de referencia MINEDUC 2026 para becas (BES, BJG, BAES). Tope de cobertura.';
COMMENT ON COLUMN public.programs.arancel_referencia_creditos IS 'Arancel de referencia MINEDUC 2026 para créditos (CAE, Fondo Solidario). Tope de cobertura.';
COMMENT ON COLUMN public.programs.brecha_arancel_becas        IS 'Diferencia entre arancel real y referencia becas. Lo que podría pagar el alumno.';
COMMENT ON COLUMN public.programs.brecha_arancel_creditos     IS 'Diferencia entre arancel real y referencia créditos. Lo que podría pagar el alumno.';

-- Índice para consultas de comparación por brecha
CREATE INDEX IF NOT EXISTS idx_programs_brecha_becas
  ON public.programs (brecha_arancel_becas)
  WHERE is_current = true AND brecha_arancel_becas > 0;
