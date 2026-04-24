/**
 * POST /api/tools/search-career-match
 * Body: {
 *   keywords?: string[],          // ej: ['diseño','tecnología']
 *   area?: string,                // 'Tecnología', 'Salud', etc.
 *   tipo_institucion?: string,    // 'Universidades' | 'Institutos Profesionales' | 'Centros de Formación Técnica'
 *   region?: string,
 *   max_arancel?: number,
 *   limit?: number
 * }
 *
 * Busca PROGRAMAS ofertados oficiales (Mineduc) que hagan match y enriquece con stats.
 */
import { createClient } from '@supabase/supabase-js'

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function tokenize(input: string) {
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter(t => t.length >= 3)
}

function scoreProgram(program: any, terms: string[]) {
  const title = normalizeText(program?.nombre_carrera || '')
  const area = normalizeText(program?.area_carrera_generica || '')
  const inst = normalizeText(program?.nombre_institucion || '')
  const haystack = `${title} ${area} ${inst}`

  let score = 0
  for (const t of terms) {
    if (title.includes(t)) score += 8
    else if (area.includes(t)) score += 5
    else if (inst.includes(t)) score += 2
    else if (haystack.includes(t.slice(0, Math.max(4, t.length - 2)))) score += 1
  }

  // bonus por prioridad destacada
  score += Number(program?.priority || 0) * 0.2
  return score
}

function expandKeywords(keywords?: string[]) {
  if (!keywords?.length) return { terms: [] as string[], strictStems: [] as string[] }

  const baseTokens = keywords
    .flatMap(k => String(k).split(/[\s,;/|]+/g))
    .map(k => normalizeText(k))
    .filter(k => k.length >= 3)

  const normalizedPhrase = normalizeText(keywords.join(' '))
  const expansions = new Set<string>(baseTokens)
  const strictStems = new Set<string>()

  // Mapeo semántico mínimo para consultas frecuentes de orientación.
  if (normalizedPhrase.includes('terapia deportiva') || normalizedPhrase.includes('deporte')) {
    ;['kinesiologia', 'fisioterapia', 'deporte', 'deportiva', 'rehabilitacion', 'actividad fisica']
      .forEach(t => expansions.add(t))
    ;['kinesiolog', 'fisioterap', 'deport', 'rehabilit', 'actividad fisica']
      .forEach(s => strictStems.add(s))
  }

  if (normalizedPhrase.includes('psicologia deportiva')) {
    ;['psicologia', 'deporte', 'deportiva', 'rendimiento']
      .forEach(t => expansions.add(t))
    ;['psicolog', 'deport', 'rendim']
      .forEach(s => strictStems.add(s))
  }

  if (normalizedPhrase.includes('nutricion deportiva')) {
    ;['nutricion', 'deporte', 'deportiva', 'alimentacion']
      .forEach(t => expansions.add(t))
    ;['nutric', 'deport', 'aliment']
      .forEach(s => strictStems.add(s))
  }

  return {
    terms: [...expansions],
    strictStems: [...strictStems],
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<{
    keywords?: string[]
    area?: string
    tipo_institucion?: string
    region?: string
    max_arancel?: number
    limit?: number
  }>(event) || {}

  const limit = Math.min(Math.max(body.limit ?? 10, 1), 25)
  // Pedimos una ventana mayor para luego mezclar por institución
  // y evitar que una sola domine el top N.
  const fetchLimit = Math.min(Math.max(limit * 8, limit), 200)

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey,
  )

  let q = supabase
    .from('programs')
    .select(`
      program_unique_code, nombre_carrera, nombre_institucion, tipo_institucion,
      region, sede, jornada, area_carrera_generica, duracion_formal_semestres,
      arancel_anual, arancel_referencia_becas, arancel_referencia_creditos,
      brecha_arancel_becas, brecha_arancel_creditos,
      vacantes_semestre_1, career_generic_id,
      nivel_carrera, titulacion_total_2024,
      is_featured, priority
    `)
    .order('priority', { ascending: false })
    .order('nombre_institucion', { ascending: true })
    .limit(fetchLimit)

  if (body.area)             q = q.ilike('area_carrera_generica', `%${body.area}%`)
  if (body.tipo_institucion) q = q.eq('tipo_institucion', body.tipo_institucion)
  if (body.region)           q = q.eq('region', body.region)
  if (body.max_arancel)      q = q.lte('arancel_anual', body.max_arancel)

  const expanded = expandKeywords(body.keywords)
  if (expanded.terms.length) {
    const or = expanded.terms
      .map(k => `nombre_carrera.ilike.%${k}%,area_carrera_generica.ilike.%${k}%,nombre_institucion.ilike.%${k}%`)
      .join(',')
    q = q.or(or)
  }

  const { data: programs, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const preFiltered = programs ?? []
  let allPrograms = expanded.strictStems.length
    ? preFiltered.filter((p) => {
        const haystack = normalizeText(`${p.nombre_carrera || ''} ${p.area_carrera_generica || ''}`)
        return expanded.strictStems.some(stem => haystack.includes(stem))
      })
    : preFiltered

  // Fallback semántico/fuzzy: si no hubo match directo, hacemos una pasada amplia
  // y rankeamos por coincidencia de tokens para rescatar variaciones de nombre.
  if (!allPrograms.length && expanded.terms.length) {
    const { data: broadPrograms } = await supabase
      .from('programs')
      .select(`
        program_unique_code, nombre_carrera, nombre_institucion, tipo_institucion,
        region, sede, jornada, area_carrera_generica, duracion_formal_semestres,
        arancel_anual, arancel_referencia_becas, arancel_referencia_creditos,
        brecha_arancel_becas, brecha_arancel_creditos,
        vacantes_semestre_1, career_generic_id,
        nivel_carrera, titulacion_total_2024,
        is_featured, priority
      `)
      .order('priority', { ascending: false })
      .limit(500)

    const baseTerms = tokenize((body.keywords ?? []).join(' '))
    const rescored = (broadPrograms ?? [])
      .map((p) => ({ p, score: scoreProgram(p, baseTerms) }))
      .filter((x) => x.score >= 4)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)

    allPrograms = rescored
  }

  // Mezcla por institución (round-robin) para diversidad en resultados.
  const buckets = new Map<string, typeof allPrograms>()
  for (const p of allPrograms) {
    const key = (p.nombre_institucion || 'Sin institución').trim()
    const arr = buckets.get(key)
    if (arr) arr.push(p)
    else buckets.set(key, [p])
  }

  const selected: typeof allPrograms = []
  let addedInRound = true
  while (selected.length < limit && addedInRound) {
    addedInRound = false
    for (const arr of buckets.values()) {
      if (!arr.length) continue
      selected.push(arr.shift()!)
      addedInRound = true
      if (selected.length >= limit) break
    }
  }

  // enriquecer con stats agregadas (career_stats) para que el LLM tenga
  // ingreso 4to año + empleabilidad + retención en un solo payload.
  const genericIds = [...new Set(selected.map(p => p.career_generic_id).filter(Boolean))]
  const { data: stats } = genericIds.length
    ? await supabase
        .from('career_stats')
        .select(`
          career_generic_id,
          ingreso_4to_ano_clp,
          empleabilidad_1er_ano_pct,
          empleabilidad_2do_ano_pct,
          retencion_1er_ano_pct,
          duracion_real_semestres
        `)
        .in('career_generic_id', genericIds as string[])
    : { data: [] as any[] }
  const byId = new Map((stats ?? []).map(s => [s.career_generic_id, s]))

  return {
    count: selected.length,
    source_count: allPrograms.length,
    institutions_count: buckets.size,
    results: selected.map(p => {
      const s = p.career_generic_id ? byId.get(p.career_generic_id) : null
      return {
        ...p,
        stats: s
          ? {
              ingreso_4to_ano_clp: s.ingreso_4to_ano_clp,
              empleabilidad_1er_ano_pct: s.empleabilidad_1er_ano_pct,
              empleabilidad_2do_ano_pct: s.empleabilidad_2do_ano_pct,
              retencion_1er_ano_pct: s.retencion_1er_ano_pct,
              duracion_real_semestres: s.duracion_real_semestres,
            }
          : null,
      }
    }),
  }
})
