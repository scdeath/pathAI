-- Campos extra para el perfil de usuario
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS bio text;

-- Validacion suave para gender (permite NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_gender_check
      CHECK (gender IS NULL OR gender IN ('masculino','femenino','prefiero_no_decir'));
  END IF;
END $$;

COMMENT ON COLUMN public.users.phone IS 'Numero de contacto opcional del usuario';
COMMENT ON COLUMN public.users.gender IS 'Genero: masculino | femenino | prefiero_no_decir';
COMMENT ON COLUMN public.users.bio IS 'Bio corta opcional';
