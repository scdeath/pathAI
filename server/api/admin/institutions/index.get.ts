/**
 * GET /api/admin/institutions?search=&featured=&limit=&offset=
 * Lista instituciones con estado de destaque y plan actual (si existe).
 */
import { requireAdmin } from '~/server/utils/require-admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const q = getQuery(event) as Record<string, string>
  const limit  = Math.min(Math.max(Number(q.limit ?? 50), 1), 200)
  const offset = Math.max(Number(q.offset ?? 0), 0)

  let query = supabase
    .from('institutions')
    .select(`
      institution_code, nombre_institucion, tipo_institucion,
      acreditacion_anos, is_featured, priority, featured_until
    `, { count: 'exact' })
    .order('priority', { ascending: false })
    .order('nombre_institucion', { ascending: true })
    .range(offset, offset + limit - 1)

  if (q.search) query = query.ilike('nombre_institucion', `%${q.search}%`)
  if (q.featured === 'true')  query = query.eq('is_featured', true)
  if (q.featured === 'false') query = query.eq('is_featured', false)

  const { data, error, count } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { count: count ?? 0, limit, offset, results: data ?? [] }
})
