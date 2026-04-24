-- Función helper para actualizar aranceles de referencia en bulk
-- Usada por el script seed-aranceles-referencia.ts
CREATE OR REPLACE FUNCTION bulk_update_aranceles(records jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.programs p
  SET
    arancel_referencia_becas    = (r->>'arancel_referencia_becas')::integer,
    arancel_referencia_creditos = (r->>'arancel_referencia_creditos')::integer
  FROM jsonb_array_elements(records) AS r
  WHERE p.program_unique_code = r->>'program_unique_code';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
