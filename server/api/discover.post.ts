import { createClient } from '@supabase/supabase-js'

// --- Rate limiter via Supabase (funciona en entornos serverless/Vercel) ---
async function checkRateLimit(ip: string): Promise<void> {
  const config = useRuntimeConfig()
  // Rate limiter requiere service_role (tabla rate_limits no es accesible con anon).
  const key = config.supabaseServiceKey
  if (!key) {
    console.error('[KoraChile] Rate limit deshabilitado: falta SUPABASE_SERVICE_ROLE_KEY')
    return
  }
  const supabase = createClient(config.public.supabaseUrl, key)

  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', windowStart)

  if (countError) {
    // Fail-open intencional: no bloqueamos si Supabase falla, pero lo
    // registramos como ERROR (no warn) para que sea visible en monitoreo.
    console.error('[KoraChile] Rate limit check FAIL-OPEN:', countError.message)
    return
  }

  if ((count ?? 0) >= 10) {
    throw createError({ statusCode: 429, message: 'Demasiadas solicitudes. Intenta de nuevo en 10 minutos.' })
  }

  await supabase.from('rate_limits').insert({ ip })
}
// ---------------------------------

const SYSTEM_PROMPT = `Eres una IA de orientación vocacional para Chile especializada en análisis psicológico del lenguaje. Devuelve SOLO JSON válido, sin markdown. Sé conciso: cada descripción máximo 3 oraciones breves.

ANTES de generar las carreras, analiza internamente el texto del usuario aplicando estas técnicas (no las menciones en el JSON, úsalas para decidir qué recomendar):

1. BIG FIVE (Yarkoni 2010): Detecta rasgos en el lenguaje.
   - Responsabilidad: verbos de proceso, estructura lógica, palabras como "organizar", "planificar", "terminar"
   - Apertura: lenguaje abstracto, metáforas, curiosidad expresada, variedad de temas
   - Extraversión: verbos de interacción social, energía, palabras como "gente", "equipo", "evento"
   - Amabilidad: pronombres inclusivos ("nosotros"), verbos de ayuda, empatía expresada
   - Neuroticismo: palabras de preocupación, incertidumbre, lenguaje emocional negativo

2. SELF-CONCEPT (NER + frecuencia emocional):
   - Si usa jerga técnica de forma natural (sin explicarla), infiere competencia real en esa área
   - La frecuencia y carga emocional de los conceptos importa más que lo que dice explícitamente que "le gusta"
   - "nosotros" frecuente → perfil colaborativo/liderazgo; "yo" frecuente → perfil independiente/especialista

3. ANÁLISIS SEMÁNTICO:
   - Sentiment: qué temas generan entusiasmo vs. resignación en su texto
   - Topic modeling: cuáles son los temas recurrentes aunque no los declare como intereses
   - Stylometry: nivel de abstracción del pensamiento (operativo vs. estratégico vs. creativo)

Usa estos insights para seleccionar las 3 carreras más alineadas con el perfil REAL de la persona, no solo con lo que declara explícitamente.

Reglas (aplican a TODO el JSON): salarios reales en CLP; universidades chilenas reales (U. de Chile, PUC, USACH, DUOC, INACAP, UDP, UAI, CFTs); adapta al mercado chileno (tecnología, minería, fintech, salud, retail, agroindustria).

Estructura exacta con 3 variaciones (universitarias o no, según el perfil del usuario):
{
  "query": string,
  "summary": string,
  "variations": [{
    "id": string (slug),
    "title": string,
    "tagline": string,
    "description": string,
    "emoji": string,
    "match_score": number (70-99),
    "pros": string[3],
    "cons": string[2],
    "skills": string[5],
    "salary_range": { "junior": number, "mid": number, "senior": number, "currency": "CLP" },
    "personality_types": string[2] (tipos MBTI),
    "fun_facts": string[3],
    "job_demand": "Alta"|"Media"|"Muy Alta",
    "universities": [{ "name": string, "type": string, "location": string, "program": string }] (exactamente 3),
    "curriculum": [
      { "semester": 1, "subjects": string[4-5] },
      { "semester": 2, "subjects": string[4-5] },
      { "semester": 3, "subjects": string[4] },
      { "semester": 4, "subjects": string[4] },
      { "semester": 5, "subjects": string[3] },
      { "semester": 6, "subjects": string[3] }
    ]
  }]
}`

// Versión compacta para proveedores con límites TPM bajos (ej. Groq on_demand).
const COMPACT_SYSTEM_PROMPT = `Eres una IA vocacional para Chile. Devuelve SOLO JSON válido (sin markdown), breve y concreto.

Analiza el texto del usuario con: Big Five, self-concept y señales semánticas (temas, tono, estilo). Recomienda 3 rutas realistas para Chile.

Reglas:
- Salarios en CLP reales/estimados.
- Considera universidades e institutos chilenos.

Estructura JSON obligatoria:
{
  "query": string,
  "summary": string,
  "variations": [{
    "id": string,
    "title": string,
    "tagline": string,
    "description": string,
    "emoji": string,
    "match_score": number,
    "pros": string[3],
    "cons": string[2],
    "skills": string[5],
    "salary_range": { "junior": number, "mid": number, "senior": number, "currency": "CLP" },
    "personality_types": string[2],
    "fun_facts": string[3],
    "job_demand": "Alta"|"Media"|"Muy Alta",
    "universities": [{ "name": string, "type": string, "location": string, "program": string }],
    "curriculum": [
      { "semester": 1, "subjects": string[4-5] },
      { "semester": 2, "subjects": string[4-5] },
      { "semester": 3, "subjects": string[4] },
      { "semester": 4, "subjects": string[4] },
      { "semester": 5, "subjects": string[3] },
      { "semester": 6, "subjects": string[3] }
    ]
  }]
}`

// Para Groq 8B: pedir menos campos reduce truncamientos y mejora parseabilidad.
const GROQ_MINIMAL_PROMPT = `Eres una IA vocacional para Chile. Devuelve SOLO JSON válido, sin markdown y sin texto extra.

Devuelve exactamente este formato:
{
  "query": string,
  "summary": string,
  "variations": [
    {
      "id": string,
      "title": string,
      "tagline": string,
      "description": string,
      "emoji": string,
      "match_score": number,
      "pros": string[3],
      "cons": string[2],
      "skills": string[5],
      "job_demand": "Alta"|"Media"|"Muy Alta",
      "salary_range": { "junior": number, "mid": number, "senior": number, "currency": "CLP" }
    }
  ]
}

Reglas:
- Genera 3 variaciones.
- match_score entero entre 70 y 99.
- Todo adaptado a Chile.
- No inventes datos absurdos ni uses markdown.`

function extractLikelyJson(raw: string): string {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  cleaned = cleaned.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  return cleaned
}

function tryParsePossiblyTruncatedJson(raw: string): any {
  const cleaned = extractLikelyJson(raw)
  try {
    return JSON.parse(cleaned)
  } catch {
    let fixed = cleaned
    const quoteBalance = (fixed.match(/"/g) || []).length % 2
    if (quoteBalance !== 0) fixed += '"'

    let braces = 0
    let brackets = 0
    for (const ch of fixed) {
      if (ch === '{') braces++
      else if (ch === '}') braces--
      else if (ch === '[') brackets++
      else if (ch === ']') brackets--
    }

    while (brackets > 0) { fixed += ']'; brackets-- }
    while (braces > 0) { fixed += '}'; braces-- }

    // Corrige comas colgantes antes de } o ]
    fixed = fixed.replace(/,\s*([}\]])/g, '$1')

    return JSON.parse(fixed)
  }
}

function normalizeDiscoverResult(input: any, fallbackQuery: string) {
  const safeQuery = String(input?.query || fallbackQuery || '').trim() || fallbackQuery
  const safeSummary = String(input?.summary || 'Resultado vocacional generado por IA para Chile.').trim()
  const vars = Array.isArray(input?.variations) ? input.variations : []

  const normalizedVariations = vars.slice(0, 3).map((v: any, idx: number) => {
    const scoreRaw = Number(v?.match_score)
    const score = Number.isFinite(scoreRaw)
      ? Math.max(70, Math.min(99, scoreRaw <= 1 ? Math.round(scoreRaw * 100) : Math.round(scoreRaw)))
      : 80

    const title = String(v?.title || `Ruta vocacional ${idx + 1}`).trim()
    const id = String(v?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/(^-|-$)/g, '') || `ruta-${idx + 1}`

    const pros = Array.isArray(v?.pros) ? v.pros.filter(Boolean).map(String).slice(0, 3) : []
    while (pros.length < 3) pros.push('Buena proyección de aprendizaje')

    const cons = Array.isArray(v?.cons) ? v.cons.filter(Boolean).map(String).slice(0, 2) : []
    while (cons.length < 2) cons.push('Exige constancia y práctica')

    const skills = Array.isArray(v?.skills) ? v.skills.filter(Boolean).map(String).slice(0, 5) : []
    while (skills.length < 5) skills.push('Aprendizaje continuo')

    const sr = v?.salary_range || {}
    const salary_range = {
      junior: Number(sr.junior) || 700000,
      mid: Number(sr.mid) || 1200000,
      senior: Number(sr.senior) || 1800000,
      currency: 'CLP',
    }

    const roadmap: any[] = []

    return {
      id,
      title,
      tagline: String(v?.tagline || 'Una ruta con futuro en Chile'),
      description: String(v?.description || 'Ruta recomendada según tu perfil vocacional.'),
      emoji: String(v?.emoji || '🚀'),
      match_score: score,
      pros,
      cons,
      skills,
      salary_range,
      personality_types: Array.isArray(v?.personality_types) ? v.personality_types.slice(0, 2) : ['INTJ', 'ENTP'],
      fun_facts: Array.isArray(v?.fun_facts) ? v.fun_facts.slice(0, 3) : ['Tiene alta demanda de talento en Chile', 'Permite crecimiento profesional continuo', 'Combina teoría con aplicación práctica'],
      books: [],
      job_demand: (v?.job_demand === 'Muy Alta' || v?.job_demand === 'Alta' || v?.job_demand === 'Media') ? v.job_demand : 'Alta',
      roadmap: [],
      universities: Array.isArray(v?.universities) ? v.universities.slice(0, 3) : [],
      notable_people: [],
      curriculum: Array.isArray(v?.curriculum) ? v.curriculum.slice(0, 6) : [],
    }
  })

  while (normalizedVariations.length < 3) {
    const i = normalizedVariations.length + 1
    normalizedVariations.push({
      id: `ruta-${i}`,
      title: `Ruta vocacional ${i}`,
      tagline: 'Alternativa alineada a tu perfil',
      description: 'Propuesta adicional para ampliar tus opciones de estudio y trabajo.',
      emoji: '🎯',
      match_score: 78,
      pros: ['Buena empleabilidad', 'Ruta flexible', 'Aprendizaje transferible'],
      cons: ['Requiere disciplina', 'Curva de aprendizaje inicial'],
      skills: ['Comunicación', 'Pensamiento crítico', 'Trabajo en equipo', 'Resolución de problemas', 'Aprendizaje continuo'],
      salary_range: { junior: 700000, mid: 1200000, senior: 1800000, currency: 'CLP' },
      personality_types: ['INTJ', 'ENTP'],
      fun_facts: ['Opción con demanda estable', 'Permite especialización', 'Tiene salida en varias industrias'],
      books: [],
      job_demand: 'Alta',
      roadmap: [],
      universities: [],
      notable_people: [],
      curriculum: [],
    })
  }

  return {
    query: safeQuery,
    summary: safeSummary,
    variations: normalizedVariations,
  }
}

async function repairJsonWithProvider(rawText: string, config: ReturnType<typeof useRuntimeConfig>): Promise<string> {
  const repairPrompt = `Repara este contenido para que sea JSON válido estricto.\n\nReglas:\n- Devuelve SOLO JSON, sin markdown.\n- Mantén la misma estructura esperada (query, summary, variations...).\n- Si está truncado, completa lo faltante de forma breve y coherente.\n- No agregues comentarios.\n\nContenido a reparar:\n${rawText.slice(0, 10000)}`

  if (config.githubToken) {
    try {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          temperature: 0.1,
          max_tokens: 1800,
          messages: [
            { role: 'system', content: 'Eres un reparador de JSON. Devuelve únicamente JSON válido.' },
            { role: 'user', content: repairPrompt },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // continúa con Groq
    }
  }

  if (config.groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
          max_tokens: 1200,
          messages: [
            { role: 'system', content: 'Eres un reparador de JSON. Devuelve únicamente JSON válido.' },
            { role: 'user', content: repairPrompt.slice(0, 7000) },
          ],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // sin más fallback
    }
  }

  return ''
}

export default defineEventHandler(async (event) => {
  const forwarded = getHeader(event, 'x-forwarded-for') ?? ''
  const ip =
    forwarded.split(',')[0]?.trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress ||
    'unknown'

  await checkRateLimit(ip)

  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    throw createError({ statusCode: 400, message: 'La consulta debe tener al menos 5 caracteres.' })
  }
  if (query.trim().length > 1000) {
    throw createError({ statusCode: 400, message: 'La consulta no puede superar los 1000 caracteres.' })
  }

  const trimmedQuery = query.trim()
  const userMessage = `Texto de la persona: "${trimmedQuery}"`
  let rawText = ''

  if (!config.githubToken && !config.groqApiKey && !config.ollamaUrl) {
    console.error('[KoraChile] ⛔ Ninguna variable de proveedor configurada. Define APY_GIT o GROQ en las variables de entorno.')
  }

  // --- 1. GitHub Models / Meta-Llama-3.1-8B-Instruct (PRIORIDAD — rápido) ---
  if (!rawText && config.githubToken) {
    try {
      console.log('[KoraChile] Intentando con GitHub Models (Meta-Llama-3.1-8B)...')
      const llamaRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'meta/Meta-Llama-3.1-8B-Instruct',
          temperature: 0.5,
          max_tokens: 900,
          messages: [
            { role: 'system', content: GROQ_MINIMAL_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (llamaRes.ok) {
        const llamaData = await llamaRes.json()
        rawText = llamaData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ Meta-Llama (GitHub Models) OK')
        else console.warn('[KoraChile] ⚠️ Meta-Llama respondió vacío')
      } else {
        const errBody = await llamaRes.text()
        console.warn(`[KoraChile] ⚠️ Meta-Llama HTTP ${llamaRes.status}:`, errBody)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ Meta-Llama no disponible — probando GPT-4.1-mini...')
    }
  }

  // --- 2. GitHub Models / GPT-4.1-mini (mayor capacidad, fallback) ---
  if (!rawText && config.githubToken) {
    try {
      console.log('[KoraChile] Intentando con GitHub Models (GPT-4.1-mini)...')
      const ghRes = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: 'openai/gpt-4.1-mini',
          temperature: 0.7,
          max_tokens: 3200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (ghRes.ok) {
        const ghData = await ghRes.json()
        rawText = ghData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ GitHub Models GPT-4.1-mini OK')
        else console.warn('[KoraChile] ⚠️ GPT-4.1-mini respondió vacío')
      } else {
        const errBody = await ghRes.text()
        console.warn(`[KoraChile] ⚠️ GPT-4.1-mini HTTP ${ghRes.status}:`, errBody)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ GPT-4.1-mini no disponible — probando Groq...')
    }
  }

  // --- 3. Groq (fallback) ---
  if (!rawText && config.groqApiKey) {
    try {
      console.log('[KoraChile] Intentando con Groq...')
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.5,
          max_tokens: 900,
          messages: [
            { role: 'system', content: GROQ_MINIMAL_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (groqRes.ok) {
        const groqData = await groqRes.json()
        rawText = groqData.choices?.[0]?.message?.content || ''
        if (rawText) console.log('[KoraChile] ✅ Groq OK')
        else console.warn('[KoraChile] ⚠️ Groq respondió vacío')
      } else {
        const errBody = await groqRes.text()
        console.warn(`[KoraChile] ⚠️ Groq HTTP ${groqRes.status}:`, errBody)

        // Reintento defensivo si excede límite TPM/tamaño.
        if (groqRes.status === 413 || /Request too large|tokens per minute|TPM/i.test(errBody)) {
          const safeMessage = `Texto de la persona: "${trimmedQuery.slice(0, 450)}"`
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.groqApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              temperature: 0.4,
              max_tokens: 750,
              messages: [
                { role: 'system', content: GROQ_MINIMAL_PROMPT },
                { role: 'user', content: safeMessage },
              ],
            }),
          })

          if (retryRes.ok) {
            const retryData = await retryRes.json()
            rawText = retryData.choices?.[0]?.message?.content || ''
            if (rawText) console.log('[KoraChile] ✅ Groq OK (retry compact)')
          } else {
            const retryErr = await retryRes.text()
            console.warn(`[KoraChile] ⚠️ Groq retry HTTP ${retryRes.status}:`, retryErr)
          }
        }
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ Groq no disponible — probando Ollama...')
    }
  }

  // --- 4. Ollama local (fallback) ---
  if (!rawText && config.ollamaUrl) {
    try {
      console.log(`[KoraChile] Intentando con Ollama (${config.ollamaModel})...`)
      const ollamaRes = await fetch(`${config.ollamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({
          model: config.ollamaModel,
          temperature: 0.8,
          max_tokens: 2200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (ollamaRes.ok) {
        const data = await ollamaRes.json()
        rawText = data.choices?.[0]?.message?.content || ''
        if (rawText) console.log(`[KoraChile] ✅ Ollama (${config.ollamaModel}) OK`)
        else console.warn('[KoraChile] ⚠️ Ollama respondió vacío')
      } else {
        console.warn(`[KoraChile] ⚠️ Ollama HTTP ${ollamaRes.status}`)
      }
    } catch (e) {
      console.warn('[KoraChile] ⚠️ Ollama no disponible')
    }
  }

  if (!rawText) {
    throw createError({
      statusCode: 502,
      message: 'No se obtuvo respuesta de ningún proveedor de IA. Verifica que las variables APY_GIT (GitHub Models) o GROQ estén configuradas correctamente en el entorno.',
    })
  }

  // Parseo robusto + autorreparación si el modelo devuelve JSON truncado
  let parsed
  try {
    parsed = tryParsePossiblyTruncatedJson(rawText)
  } catch {
    console.warn('[KoraChile] JSON inválido, intentando reparación automática...')
    const repairedText = await repairJsonWithProvider(rawText, config)

    try {
      parsed = tryParsePossiblyTruncatedJson(repairedText)
      console.log('[KoraChile] ✅ JSON reparado automáticamente')
    } catch {
      console.error('[KoraChile] rawText no parseable (primeros 800 chars):\n', rawText?.slice(0, 800))
      // Fail-soft: evitar 502 y devolver estructura mínima utilizable.
      parsed = {
        query: trimmedQuery,
        summary: 'No se pudo parsear completamente la respuesta de IA. Se entrega una versión simplificada.',
        variations: [],
      }
    }
  }

  parsed = normalizeDiscoverResult(parsed, trimmedQuery)

  // ✅ Supabase igual que antes
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey || config.public.supabaseAnonKey
  )

  const { data: session, error: dbError } = await supabase
    .from('discovery_sessions')
    .insert({ query: query.trim(), result: parsed })
    .select('id')
    .single()

  if (dbError) {
    console.error('Supabase insert error:', dbError)
  }

  return {
    sessionId: session?.id || null,
    result: parsed,
  }
})