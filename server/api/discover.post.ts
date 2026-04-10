import { createClient } from '@supabase/supabase-js'

// --- Rate limiter en memoria ---
const RATE_LIMIT_MAX = 10        // max requests por ventana
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000  // 10 minutos

const ipRequestMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): void {
  const now = Date.now()
  const entry = ipRequestMap.get(ip)

  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      message: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfterSec} segundos.`,
    })
  }

  entry.count++
}
// ---------------------------------

const SYSTEM_PROMPT = `Eres una IA especializada en descubrimiento de carreras para el mercado laboral de Chile. Analiza los intereses del usuario considerando el contexto chileno y devuelve SOLO un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura exacta:

{
  "query": "<repite el input del usuario>",
  "summary": "<resumen de 2-3 oraciones sobre por qué estas carreras encajan, mencionando la demanda o contexto en Chile>",
  "variations": [
    {
      "id": "<slug como 'diseñador-ux'>",
      "title": "<Título de Carrera>",
      "tagline": "<Una línea que capture esta carrera>",
      "description": "<3-4 oraciones sobre este camino de carrera en Chile: menciona sectores con alta demanda local (tecnología, minería, fintech, salud, retail, agroindustria) y perspectivas del mercado nacional>",
      "emoji": "<un emoji relevante>",
      "match_score": <número 70-99>,
      "pros": ["<ventaja 1>", "<ventaja 2>", "<ventaja 3>"],
      "cons": ["<desventaja 1>", "<desventaja 2>"],
      "skills": ["<habilidad 1>", "<habilidad 2>", "<habilidad 3>", "<habilidad 4>", "<habilidad 5>"],
      "salary_range": {
        "junior": <sueldo junior en CLP, ej: 800000>,
        "mid": <sueldo mid en CLP, ej: 1400000>,
        "senior": <sueldo senior en CLP, ej: 2500000>,
        "currency": "CLP"
      },
      "personality_types": ["<tipo MBTI 1>", "<tipo MBTI 2>"],
      "fun_facts": ["<dato curioso 1 sobre esta carrera en Chile>", "<dato curioso 2>", "<dato curioso 3>"],
      "books": [
        { "title": "<título del libro>", "author": "<autor>", "description": "<por qué leerlo, 1 oración>", "emoji": "<emoji>" },
        { "title": "<título>", "author": "<autor>", "description": "<por qué>", "emoji": "<emoji>" },
        { "title": "<título>", "author": "<autor>", "description": "<por qué>", "emoji": "<emoji>" }
      ],
      "job_demand": "<Alta|Media|Muy Alta>",
      "roadmap": [
        {
          "phase": "Fundación",
          "duration": "0-3 meses",
          "milestones": ["<hito 1 con recursos en Chile>", "<hito 2>"],
          "theory": ["<tema teórico 1 que hay que dominar en esta fase>", "<tema teórico 2>", "<tema teórico 3>"]
        },
        {
          "phase": "Construcción",
          "duration": "3-9 meses",
          "milestones": ["<hito 1 mencionando portafolio o certificaciones>", "<hito 2>"],
          "theory": ["<tema teórico 1>", "<tema teórico 2>", "<tema teórico 3>"]
        },
        {
          "phase": "Primer trabajo",
          "duration": "9-18 meses",
          "milestones": ["<hito 1 mencionando plataformas chilenas como Laborum, GetOnBoard>", "<hito 2>"],
          "theory": ["<tema teórico 1>", "<tema teórico 2>"]
        }
      ],
      "universities": [
        { "name": "<nombre institución>", "type": "<Universidad|Instituto|CFT|DUOC>", "location": "<ciudad>", "program": "<nombre del programa o carrera>" },
        { "name": "<nombre institución>", "type": "<tipo>", "location": "<ciudad>", "program": "<programa>" },
        { "name": "<nombre institución>", "type": "<tipo>", "location": "<ciudad>", "program": "<programa>" }
      ]
    }
  ]
}

Devuelve exactamente 3 variaciones de carrera. Las carreras pueden ser universitarias (ingeniería, medicina, derecho, etc.) O NO universitarias (técnico, oficio, emprendimiento, arte, deporte, etc.) — elige lo que mejor encaje con el perfil del usuario, sin preferencia por títulos formales.

Adapta todo al contexto chileno: salarios reales en CLP, universidades y centros de formación chilenos (U. de Chile, PUC, USACH, DUOC, INACAP, UDP, UAI, CFTs, institutos técnicos), y empresas o sectores locales representativos.

Para personality_types usa tipos MBTI reales (INTJ, ENFP, ISTP, etc.) que suelen destacar en esa carrera.

Para books: recomienda SIEMPRE exactamente 3 libros REALES y reconocidos — que existan de verdad y sean ampliamente valorados por crítica, popularidad o por la comunidad del área (bestsellers, clásicos del sector, libros de referencia obligada). NO inventes títulos ni autores. Si la carrera es muy técnica o de nicho y no hay 3 libros de referencia claros, combina libros técnicos con libros de mentalidad o soft skills valorados en ese campo.

Sé específico y práctico. Sin formato markdown en la respuesta.`

export default defineEventHandler(async (event) => {
  const forwarded = getHeader(event, 'x-forwarded-for') ?? ''
  const ip =
    forwarded.split(',')[0]?.trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress ||
    'unknown'

  checkRateLimit(ip)

  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    throw createError({ statusCode: 400, message: 'La consulta debe tener al menos 5 caracteres.' })
  }
  if (query.trim().length > 1000) {
    throw createError({ statusCode: 400, message: 'La consulta no puede superar los 1000 caracteres.' })
  }

  const userMessage = `Mis intereses y experiencia: ${query.trim()}`
  let rawText = ''

  // --- 1. Ollama local (solo si está configurado, solo para desarrollo) ---
  if (config.ollamaUrl) {
    try {
      const ollamaRes = await fetch(`${config.ollamaUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000), // 8s timeout — si no hay Ollama en producción, falla rápido
        body: JSON.stringify({
          model: config.ollamaModel,
          temperature: 0.8,
          max_tokens: 6000,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })
      if (ollamaRes.ok) {
        const data = await ollamaRes.json()
        rawText = data.choices?.[0]?.message?.content || ''
        if (rawText) console.log(`[OrientaAI] Respuesta de Ollama (${config.ollamaModel})`)
      }
    } catch {
      console.warn('[OrientaAI] Ollama no disponible, usando OpenRouter...')
    }
  }

  // --- 2. OpenRouter con fallback entre modelos gratuitos ---
  if (!rawText) {
    if (!config.openrouterApiKey) {
      throw createError({ statusCode: 500, message: 'OPENROUTER_API_KEY no configurada en el servidor.' })
    }

    const FREE_MODELS = [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'deepseek/deepseek-r1:free',
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      // Fallback de pago ultra-barato (~$0.00004 por búsqueda)
      'meta-llama/llama-3.1-8b-instruct',
    ]

    let lastError = ''

    for (const model of FREE_MODELS) {
      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://orientaai.cl',
          'X-Title': 'OrientaAI',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        }),
      })

      if (orResponse.ok) {
        const orData = await orResponse.json()
        rawText = orData.choices?.[0]?.message?.content || ''
        if (rawText) {
          console.log(`[OrientaAI] Respuesta obtenida con modelo: ${model}`)
          break
        }
      } else {
        const errJson = await orResponse.json().catch(() => null)
        lastError = `[${model}] HTTP ${orResponse.status}: ${JSON.stringify(errJson)}`
        console.warn(`[OrientaAI] ${lastError} — probando siguiente modelo...`)
        continue
      }
    }

    if (!rawText) {
      throw createError({ statusCode: 429, message: 'Todos los modelos están saturados en este momento. Intenta en unos segundos.' })
    }
  }

  // Parseo robusto: extrae el primer objeto JSON válido aunque haya texto extra o esté truncado
  let parsed
  try {
    // 1. Elimina bloques <think>...</think> (DeepSeek R1 y similares)
    let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    // 2. Limpia bloques de markdown
    cleaned = cleaned.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    // 2. Extrae desde el primer '{' hasta el último '}'
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1)
    }
    // 3. Intento directo
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // 4. Si está truncado, cierra arrays/objetos abiertos y reintenta
      let fixed = cleaned
      // Cierra strings sin cerrar (comilla suelta al final)
      const quoteBalance = (fixed.match(/"/g) || []).length % 2
      if (quoteBalance !== 0) fixed += '"'
      // Cuenta llaves y corchetes abiertos
      let braces = 0, brackets = 0
      for (const ch of fixed) {
        if (ch === '{') braces++
        else if (ch === '}') braces--
        else if (ch === '[') brackets++
        else if (ch === ']') brackets--
      }
      // Cierra arrays primero, luego objetos
      while (brackets > 0) { fixed += ']'; brackets-- }
      while (braces > 0) { fixed += '}'; braces-- }
      parsed = JSON.parse(fixed)
    }
  } catch {
    console.error('[OrientaAI] rawText no parseable (primeros 800 chars):\n', rawText?.slice(0, 800))
    throw createError({ statusCode: 502, message: 'Error al parsear la respuesta de IA como JSON. Revisa la consola del servidor para ver el rawText.' })
  }

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