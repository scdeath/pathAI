-- Preferencias vocacionales del usuario para personalizar la experiencia
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_institution_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_areas             text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS region_interes              text,
  ADD COLUMN IF NOT EXISTS anio_egreso                 integer;

COMMENT ON COLUMN public.users.preferred_institution_types IS 'Tipos de institución preferidos: Universidades | Institutos Profesionales | Centros de Formación Técnica';
COMMENT ON COLUMN public.users.preferred_areas IS 'Áreas de carrera de interés: tecnologia | salud | negocios | arte | ciencias | derecho | educacion';
COMMENT ON COLUMN public.users.region_interes IS 'Región donde le gustaría estudiar';
COMMENT ON COLUMN public.users.anio_egreso IS 'Año esperado de egreso de enseñanza media';
