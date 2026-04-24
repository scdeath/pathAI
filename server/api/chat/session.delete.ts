// DELETE /api/chat/session
// Elimina todos los mensajes de una sesión de chat del usuario autenticado.
// Body: { sessionId: string }
//
// Seguridad: el WHERE incluye user_id = JWT.sub, por lo que un usuario
// nunca puede borrar mensajes de otro aunque conozca el session_id.

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Falta token de sesión.' })
  }

  // Verificar JWT con clave anon
  const anon = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida.' })
  }

  const body = await readBody(event)
  const { sessionId } = body ?? {}

  if (!sessionId || typeof sessionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'sessionId requerido.' })
  }

  // Usamos service_role para poder borrar, pero el WHERE garantiza que solo
  // se borran filas del usuario autenticado.
  const service = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  const { error } = await service
    .from('chat_messages')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('session_id', sessionId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Error al eliminar: ${error.message}` })
  }

  return { ok: true }
})
