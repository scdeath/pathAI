import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `Eres una IA especializada en descubrimiento de carreras. Analiza los intereses del usuario y devuelve SOLO un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura exacta:

{
  "query": "<repite el input del usuario>",
  "summary": "<resumen de 2 oraciones sobre por qué estas carreras encajan>",
  "variations": [
    {
      "id": "<slug como 'diseñador-ux'>",
      "title": "<Título de Carrera>",
      "tagline": "<Una línea que capture esta carrera>",
      "description": "<3-4 oraciones sobre este camino de carrera>",
      "emoji": "<un emoji relevante>",
      "match_score": <número 70-99>,
      "pros": ["<ventaja 1>", "<ventaja 2>", "<ventaja 3>"],
      "cons": ["<desventaja 1>", "<desventaja 2>"],
      "skills": ["<habilidad 1>", "<habilidad 2>", "<habilidad 3>", "<habilidad 4>", "<habilidad 5>"],
      "roadmap": [
        {
          "phase": "Fundación",
          "duration": "0-3 meses",
          "milestones": ["<hito 1>", "<hito 2>"]
        },
        {
          "phase": "Construcción",
          "duration": "3-9 meses",
          "milestones": ["<hito 1>", "<hito 2>"]
        },
        {
          "phase": "Primer trabajo",
          "duration": "9-18 meses",
          "milestones": ["<hito 1>", "<hito 2>"]
        }
      ]
    }
  ]
}

Devuelve exactamente 3 variaciones de carrera. Sé específico y práctico. Sin formato markdown en la respuesta.`

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { query } = body

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    throw createError({ statusCode: 400, message: 'La consulta debe tener al menos 5 caracteres.' })
  }

  const apiKey = config.groqApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'Clave API de Groq no configurada. Agrega GROQ_API_KEY a tu archivo .env.' })
  }

  // ✅ Llama a Groq en lugar de Gemini
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Mis intereses y experiencia: ${query.trim()}` },
      ],
    }),
  })

  if (!groqResponse.ok) {
    const errText = await groqResponse.text()
    throw createError({ statusCode: 502, message: `Error de Groq API: ${errText}` })
  }

  const groqData = await groqResponse.json()
  const rawText = groqData.choices[0]?.message?.content || ''

  // ✅ Parseo igual que antes
  let parsed
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw createError({ statusCode: 502, message: 'Error al parsear la respuesta de IA como JSON.' })
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