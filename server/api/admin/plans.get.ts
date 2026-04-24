/**
 * GET /api/admin/plans — catálogo público, pero aislamos el consumo al panel admin
 */
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { plans: data ?? [] }
})
