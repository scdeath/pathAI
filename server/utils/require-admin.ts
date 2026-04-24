/**
 * Helper para endpoints de admin.
 * Valida que el usuario autenticado tenga role = 'admin'.
 * Devuelve el cliente con service_role (escritura) + el userId verificado.
 */
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Falta token de sesión.' })
  }

  // Cliente anon para validar el JWT
  const anon = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data: userData, error: userErr } = await anon.auth.getUser(token)
  if (userErr || !userData?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida.' })
  }

  // Verificar rol en tabla users
  const service = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )
  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Requiere rol admin.' })
  }

  return { userId: userData.user.id, supabase: service }
}
