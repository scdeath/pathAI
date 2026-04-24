/**
 * GET /api/tools/compare-institutions?nombres=UDP,U. de Chile
 *   o ?institution_codes=3,11
 *
 * Compara lado a lado hasta 4 instituciones en métricas clave:
 * acreditación, matrícula actual y por año, retención, duración real,
 * infraestructura (m2, laboratorios, biblioteca, computadores),
 * NEM/PAES promedio, titulados.
 *
 * Uso típico: "¿Cuál tiene mejor infraestructura, UDP o la U. Central?"
 *             "¿Cuál tiene más años de acreditación?"
 */
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { nombres, institution_codes, nombre_carrera } = getQuery(event) as Record<string, string>

  if (!nombres && !institution_codes) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entrega `nombres` (CSV) o `institution_codes` (CSV).',
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  const cols = `
    institution_code, nombre_institucion, tipo_institucion,
    direccion_sede_central, pagina_web,
    acreditacion_estado, acreditacion_anos, acreditacion_vigencia_hasta,
    matricula_pregrado_actual, matricula_posgrado_actual,
    titulados_pregrado_actual, retencion_1er_ano_pct,
    duracion_formal_semestres, duracion_real_semestres,
    promedio_nem, promedio_paes, total_jce,
    m2_construidos, volumenes_biblioteca,
    laboratorios_talleres, computadores,
    matricula_pregrado_por_ano
  `

  let rows: any[] = []

  if (institution_codes) {
    const codes = institution_codes.split(',').map(s => Number(s.trim())).filter(Boolean).slice(0, 4)
    const { data, error } = await supabase
      .from('institutions')
      .select(cols)
      .in('institution_code', codes)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    rows = data ?? []
  } else {
    const names = nombres.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
    for (const n of names) {
      const { data } = await supabase
        .from('institutions')
        .select(cols)
        .ilike('nombre_institucion', `%${n}%`)
        .limit(1)
      if (data?.[0]) rows.push(data[0])
    }
  }

  if (!rows.length) return { match: 'none', institutions: [] }

  // Calcular "ganador" por métrica para que la IA tenga ranking listo
  const metrics = [
    ['acreditacion_anos', 'desc'],
    ['matricula_pregrado_actual', 'desc'],
    ['retencion_1er_ano_pct', 'desc'],
    ['duracion_real_semestres', 'asc'], // menor es mejor
    ['promedio_paes', 'desc'],
    ['m2_construidos', 'desc'],
    ['volumenes_biblioteca', 'desc'],
    ['laboratorios_talleres', 'desc'],
    ['computadores', 'desc'],
  ] as const

  const rankings: Record<string, string | null> = {}
  for (const [key, order] of metrics) {
    const sorted = [...rows].filter(r => r[key] != null)
      .sort((a, b) => order === 'desc' ? b[key] - a[key] : a[key] - b[key])
    rankings[key] = sorted[0]?.nombre_institucion ?? null
  }

  let employability_by_career: any[] = []
  if (nombre_carrera) {
    const institutionNames = rows
      .map(r => r.nombre_institucion)
      .filter(Boolean)

    if (institutionNames.length) {
      const { data: empRows } = await supabase
        .from('career_employability')
        .select(`
          nombre_institucion,
          nombre_carrera_titulo,
          empleabilidad_1_ano_pct,
          empleabilidad_2_ano_pct,
          ingreso_label,
          ingreso_min_clp,
          ingreso_max_clp
        `)
        .ilike('nombre_carrera_titulo', `%${nombre_carrera}%`)
        .in('nombre_institucion', institutionNames)
        .limit(40)

      employability_by_career = empRows ?? []
    }
  }

  return {
    count: rows.length,
    institutions: rows,
    rankings,
    employability_by_career,
    note: 'rankings indica la institución líder en cada métrica (duracion_real: menor es mejor).',
  }
})
