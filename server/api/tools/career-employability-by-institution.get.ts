/**
 * GET /api/tools/career-employability-by-institution
 *   ?nombre_carrera=...&nombre_institucion=...&institution_code=...&area=...&limit=15
 *
 * Datos de empleabilidad e ingresos a nivel carrera-título POR INSTITUCIÓN.
 *
 * Estrategia:
 *  1. Si viene `institution_code` -> consulta por FK numérica (preferido).
 *  2. Si viene `nombre_institucion` -> se resuelve al code via resolver
 *     central (server/utils/institution-resolver) y luego se consulta por FK.
 *  3. Fallback a ILIKE si el resolver no encuentra match.
 */
import { createClient } from '@supabase/supabase-js'
import { resolveInstitution } from '~/server/utils/institution-resolver'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const q = getQuery(event) as Record<string, string>
  const limit = Math.min(Math.max(Number(q.limit ?? 15), 1), 30)

  if (!q.nombre_carrera && !q.nombre_institucion && !q.institution_code && !q.area) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entrega al menos `nombre_carrera`, `nombre_institucion`, `institution_code` o `area`.',
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  const selectCols = `
    institution_code, nombre_institucion, tipo_institucion, acreditacion_institucion,
    area, nombre_carrera_generica, nombre_carrera_titulo,
    retencion_1_ano_pct, duracion_real_semestres,
    empleabilidad_1_ano_pct, empleabilidad_2_ano_pct,
    titulados_continuidad_pct,
    ingreso_label, ingreso_min_clp, ingreso_max_clp
  `

  let resolvedCode: number | null = q.institution_code ? Number(q.institution_code) : null
  let resolvedNombre: string | null = null
  let resolutionVia: string | null = q.institution_code ? 'explicit-code' : null

  if (!resolvedCode && q.nombre_institucion) {
    const r = await resolveInstitution(supabase, q.nombre_institucion)
    if (r) {
      resolvedCode = r.institution_code
      resolvedNombre = r.nombre_oficial
      resolutionVia = r.via
    }
  }

  async function runQueryByCode(code: number) {
    let query = supabase.from('career_employability').select(selectCols)
      .eq('institution_code', code)
      .order('empleabilidad_1_ano_pct', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (q.nombre_carrera) query = query.ilike('nombre_carrera_titulo', `%${q.nombre_carrera}%`)
    if (q.area) query = query.eq('area', q.area)
    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data ?? []
  }

  async function runQueryByName(name: string | null) {
    let query = supabase.from('career_employability').select(selectCols)
      .order('empleabilidad_1_ano_pct', { ascending: false, nullsFirst: false })
      .limit(limit)
    if (name) query = query.ilike('nombre_institucion', `%${name}%`)
    if (q.nombre_carrera) query = query.ilike('nombre_carrera_titulo', `%${q.nombre_carrera}%`)
    if (q.area) query = query.eq('area', q.area)
    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data ?? []
  }

  let data: any[] = []
  let searchMode = 'none'

  if (resolvedCode) {
    data = await runQueryByCode(resolvedCode)
    searchMode = `by-code:${resolvedCode}`
  }

  // Fallback: si el code no devolvió resultados y había nombre, intenta ILIKE
  if (data.length === 0 && q.nombre_institucion) {
    data = await runQueryByName(q.nombre_institucion)
    if (data.length > 0) searchMode = 'by-name-fallback'
  }

  // Caso sin institución: solo carrera/area
  if (data.length === 0 && !resolvedCode && !q.nombre_institucion) {
    data = await runQueryByName(null)
    searchMode = 'by-carrera-area'
  }

  if (data.length === 0) {
    return {
      count: 0,
      resolution: {
        nombre_input: q.nombre_institucion ?? null,
        institution_code: resolvedCode,
        nombre_oficial: resolvedNombre,
        via: resolutionVia,
        search_mode: searchMode,
      },
      message: `No se encontraron datos SIES (carrera="${q.nombre_carrera ?? ''}", institucion="${q.nombre_institucion ?? ''}", code=${resolvedCode ?? 'n/a'}). NO inventes valores. Di al usuario que no hay datos y sugiere mifuturo.cl.`,
      results: [],
    }
  }

  return {
    count: data.length,
    resolution: {
      nombre_input: q.nombre_institucion ?? null,
      institution_code: resolvedCode,
      nombre_oficial: resolvedNombre,
      via: resolutionVia,
      search_mode: searchMode,
    },
    results: data,
  }
})
