/**
 * GET /api/tools/rank-institutions
 *   ?metric=acreditacion|matricula|retencion|paes|m2|biblioteca|laboratorios
 *   &order=desc|asc
 *   &tipo_institucion=...&limit=10
 *
 * Ranking TOP N de instituciones por métrica.
 * Uso: "¿Qué universidades tienen más años de acreditación?"
 *      "¿Cuáles tienen mejor infraestructura?"
 */
import { createClient } from '@supabase/supabase-js'

const METRIC_MAP: Record<string, string> = {
  acreditacion: 'acreditacion_anos',
  matricula: 'matricula_pregrado_actual',
  titulados: 'titulados_pregrado_actual',
  retencion: 'retencion_1er_ano_pct',
  paes: 'promedio_paes',
  nem: 'promedio_nem',
  duracion_real: 'duracion_real_semestres',
  m2: 'm2_construidos',
  biblioteca: 'volumenes_biblioteca',
  laboratorios: 'laboratorios_talleres',
  computadores: 'computadores',
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const q = getQuery(event) as Record<string, string>
  const metric = METRIC_MAP[q.metric ?? 'acreditacion']
  if (!metric) {
    throw createError({
      statusCode: 400,
      statusMessage: `metric inválida. Usa: ${Object.keys(METRIC_MAP).join(', ')}`,
    })
  }
  const order = q.order === 'asc' ? { ascending: true } : { ascending: false }
  const limit = Math.min(Math.max(Number(q.limit ?? 10), 1), 25)

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  let query = supabase
    .from('institutions')
    .select(`institution_code, nombre_institucion, tipo_institucion,
             direccion_sede_central, acreditacion_anos,
             is_featured, priority, ${metric}`)
    .not(metric, 'is', null)
    // Destacados primero (priority desc), luego la métrica solicitada
    .order('priority', { ascending: false })
    .order(metric, { ...order, nullsFirst: false })
    .limit(limit)

  if (q.tipo_institucion) query = query.eq('tipo_institucion', q.tipo_institucion)

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { metric: q.metric, order: q.order ?? 'desc', count: data?.length ?? 0, results: data ?? [] }
})
