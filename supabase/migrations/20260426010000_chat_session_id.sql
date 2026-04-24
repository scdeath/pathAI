-- Soporte de sesiones de chat para "Nuevo chat"
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id uuid;

-- Backfill para mensajes antiguos
UPDATE public.chat_messages
SET session_id = gen_random_uuid()
WHERE session_id IS NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session_created
  ON public.chat_messages (user_id, session_id, created_at);
