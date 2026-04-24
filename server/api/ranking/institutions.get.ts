/**
 * GET /api/ranking/institutions — Ranking de instituciones chilenas
 *
 * Calcula un score 0-100 combinando:
 *  - Acreditación (años): peso 40%
 *  - Retención 1er año (%): peso 25%
 *  - Promedio PAES: peso 20%
 *  - Matrícula pregrado (log-normalizada): peso 15%
 *
 * Query params:
 *  - tipo: filtra por tipo_institucion (opcional)
 *  - limit: cantidad máxima (default 50)
 *  - search: texto en nombre (opcional)
 */
import { createClient } from '@supabase/supabase-js'

interface InstitutionRow {
  institution_code: number
  nombre_institucion: string
  tipo_institucion: string | null
  pagina_web: string | null
  direccion_sede_central: string | null
  acreditacion_estado: string | null
  acreditacion_anos: number | null
  acreditacion_areas: string[] | null
  matricula_pregrado_actual: number | null
  titulados_pregrado_actual: number | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  promedio_nem: number | null
  duracion_real_semestres: number | null
  logo_url: string | null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tipo = typeof query.tipo === 'string' ? query.tipo : null
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  let q = supabase
    .from('institutions')
    .select(`
      institution_code,
      nombre_institucion,
      tipo_institucion,
      pagina_web,
      direccion_sede_central,
      acreditacion_estado,
      acreditacion_anos,
      acreditacion_areas,
      matricula_pregrado_actual,
      titulados_pregrado_actual,
      retencion_1er_ano_pct,
      promedio_paes,
      promedio_nem,
      duracion_real_semestres,
      logo_url
    `)
    .not('nombre_institucion', 'is', null)

  if (tipo) q = q.eq('tipo_institucion', tipo)
  if (search) q = q.ilike('nombre_institucion', `%${search}%`)

  const { data, error } = await q.limit(500)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as InstitutionRow[]

  // Normalización max para matrícula (log) → evita dominio de las mega universidades
  const logMatricula = rows.map(r => Math.log(Math.max(r.matricula_pregrado_actual || 1, 1)))
  const maxLogMat = Math.max(...logMatricula, 1)

  const scored = rows.map((r, idx) => {
    // Acreditación (0-7 años) → 0-100
    const acredScore = r.acreditacion_anos
      ? Math.min((r.acreditacion_anos / 7) * 100, 100)
      : 0

    // Retención: el dataset ya es 0-100
    const retScore = r.retencion_1er_ano_pct
      ? Math.min(Math.max(r.retencion_1er_ano_pct, 0), 100)
      : 0

    // PAES: 450-850 → 0-100
    const paesScore = r.promedio_paes
      ? Math.min(Math.max(((r.promedio_paes - 450) / 400) * 100, 0), 100)
      : 0

    // Matrícula (log-normalizada) → 0-100
    const matScore = (logMatricula[idx] / maxLogMat) * 100

    const score = Math.round(
      acredScore * 0.4 +
      retScore * 0.25 +
      paesScore * 0.2 +
      matScore * 0.15
    )

    return {
      ...r,
      score,
      breakdown: {
        acreditacion: Math.round(acredScore),
        retencion: Math.round(retScore),
        paes: Math.round(paesScore),
        matricula: Math.round(matScore),
      },
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    institutions: scored.slice(0, limit),
  }
})
