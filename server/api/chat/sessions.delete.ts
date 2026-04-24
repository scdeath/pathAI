// DELETE /api/chat/sessions
// Elimina TODOS los mensajes de chat del usuario autenticado.
//
// Seguridad: el WHERE incluye user_id = JWT.sub, por lo que solo se
// eliminan los mensajes del propio usuario.

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Falta token de sesión.' })
  }

  const anon = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida.' })
  }

  const service = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  const { error } = await service
    .from('chat_messages')
    .delete()
    .eq('user_id', userData.user.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al eliminar: ${error.message}` })
  }

  return { ok: true }
})
