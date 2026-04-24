/**
 * Helper para endpoints que requieren usuario autenticado (cualquier rol).
 * Valida el JWT de Supabase y aplica rate limiting básico in-memory.
 *
 * Uso:
 *   const { userId } = await requireAuth(event)
 */
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

// Rate limit in-memory: { userId -> [timestamps ms] }
// Se resetea al reiniciar el servidor; suficiente para MVP.
// Para producción usa Redis/Upstash.
const rateLimitBuckets = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000   // 1 minuto
const RATE_LIMIT_MAX = 20             // 20 requests por minuto por usuario

function checkRateLimit(key: string) {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(key) ?? []
  const recent = bucket.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0]
    const retryIn = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `Demasiadas solicitudes. Espera ${retryIn}s.`,
    })
  }
  recent.push(now)
  rateLimitBuckets.set(key, recent)
  // Limpieza esporádica para evitar leak de memoria
  if (rateLimitBuckets.size > 5000) {
    for (const [k, arr] of rateLimitBuckets.entries()) {
      if (!arr.some(t => now - t < RATE_LIMIT_WINDOW_MS)) rateLimitBuckets.delete(k)
    }
  }
}

export async function requireAuth(event: H3Event): Promise<{ userId: string; email: string | null }> {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Inicia sesión para continuar.' })
  }

  const anon = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesión inválida o expirada.' })
  }

  checkRateLimit(data.user.id)

  return { userId: data.user.id, email: data.user.email ?? null }
}
