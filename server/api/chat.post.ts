// POST /api/chat
// IA conversacional con RAG híbrido (pgvector) + cache semántico + tool calling.
//
// Flujo:
//   1. Check cache semántico → si hit > 0.93 similitud, devuelve sin LLM.
//   2. Retrieve híbrido (search_hybrid RPC) → inyecta datos reales al system prompt.
//   3. LLM (con tools específicas) → redacta respuesta.
//   4. Guarda (pregunta, respuesta) en cache para futuros hits.
//
// Body: { messages: [{role,content}], careersContext?: {...} }

import { aiTools, runTool } from '~/server/utils/ai-tools'
import { retrieveContext, formatContext } from '~/server/utils/hybrid-retrieval'
import { checkSemanticCache, saveSemanticCache, isVolatileAnswer } from '~/server/utils/semantic-cache'
import { requireAuth } from '~/server/utils/require-auth'

const BASE_SYSTEM_PROMPT = `Eres KoraChile, asistente de orientación vocacional para Chile.
Responde siempre en español. Tono cálido, directo y motivador. Sé conciso (2-4 párrafos).

Tu trabajo: ayudar al usuario a descubrir y comparar carreras en Chile con datos reales.

Cómo usar los datos:
- Antes de hablar de sueldos, empleabilidad, aranceles, programas o instituciones, consulta la
  herramienta correspondiente. Nunca inventes números.
- **Elegir la tool correcta**:
  · Si el usuario menciona una institución específica (AIEP, DUOC, UC, INACAP, UChile…) → SIEMPRE
    usa get_career_employability_by_institution. Esta devuelve el rango textual exacto por
    institución (ej: "De $600 mil a $700 mil").
  · Si pregunta por la carrera en general sin institución → usa get_career_stats_detailed
    (datos agregados por tipo de institución).
- Los ingresos provienen de MiFuturo/SIES y corresponden al **Ingreso Promedio al 4° año** post-titulación.
  Siempre comunícalo así: "al cuarto año de titulado/a".
- Los ingresos pueden venir como rango (ej: "De $600 mil a $700 mil"). Cita el rango tal cual —
  no calcules ni presentes un promedio.
- **REGLA CRÍTICA**: Si la herramienta no devuelve stats (lista vacía o match sin resultados),
  di: "No encontré datos SIES para esa carrera. Para info precisa visita mifuturo.cl."
  Nunca estimes ni inventes valores cuando la herramienta no devolvió datos.
- Para datos de una institución específica consulta siempre la ficha oficial.
- **Salarios típicos por nivel** (alerta si el valor recibido se aleja mucho):
  · CFT/IP técnico: $500k–$1.200k al 4° año.
  · IP profesional: $700k–$1.600k al 4° año.
  · Universidad: $900k–$3.000k+ al 4° año según carrera.

Datos de financiamiento que SÍ tienes (úsalos siempre que pregunten):
- arancel_referencia_becas: tope máximo que cubren las becas estatales (BES, BJG, BAES, BEA).
  Si el arancel real > arancel_referencia_becas, la diferencia (brecha_arancel_becas) la paga el alumno.
- arancel_referencia_creditos: tope máximo que cubre el CAE o Fondo Solidario.
  Si el arancel real > arancel_referencia_creditos, la diferencia (brecha_arancel_creditos) la paga el alumno.
- Consulta get_program_detail o search_career_match para obtener estos valores de un programa concreto.
- Ejemplo de respuesta: "El arancel de Ingeniería Civil UC es $6.500.000. La beca cubre hasta $4.700.000
  (arancel de referencia MINEDUC 2026), por lo que pagarías $1.800.000 de tu bolsillo."

Temas SIN datos en el sistema (sé honesto):
- Gratuidad (quién la recibe, montos, requisitos socioeconómicos)
- Postulación abierta, fechas DEMRE del año en curso
- Puntajes de corte del año en curso (solo tienes datos históricos si están en la ficha)
- Rankings QS/Times, acreditación internacional
Si el usuario pregunta por alguno de estos, responde: "No tengo datos oficiales sobre [tema]
en mis registros. Te sugiero revisar el portal mifuturo.cl o el sitio oficial de la universidad."
No inventes plazas, cupos ni porcentajes. No uses "sin embargo" ni muletillas para rellenar.

Cómo presentar:
- Responde con el dato, no con el origen técnico. Di "según datos SIES/Mineduc" — nunca
  menciones nombres de funciones, tablas ni herramientas internas.
- Si comparas dos instituciones, presenta los datos de ambas en el mismo párrafo.
- Cierra con una pregunta que ayude al usuario a profundizar.

Ejemplo de respuesta bien formateada:
"Según datos oficiales SIES 2025, un Ingeniero en Informática de la PUCV tiene una
empleabilidad del 81,8% al primer año. Al cuarto año post-titulación, el rango de ingreso
reportado es de $2.300.000 a $2.400.000 CLP (ingresos de carrera técnica/IP suelen ser
considerablemente menores).
¿Quieres compararlo con otra universidad o ver el arancel del programa?"
`

function buildSystemPrompt(careersContext: any): string {
  if (!careersContext?.careers?.length) return BASE_SYSTEM_PROMPT

  const careersList = careersContext.careers.map((c: any) => {
    const salary = c.salary_range
      ? `Salario junior: $${c.salary_range.junior?.toLocaleString('es-CL')} CLP`
      : ''
    return `- ${c.title} (match: ${c.match_score}%): ${c.description}. Habilidades clave: ${c.skills?.join(', ')}. ${salary}. Demanda: ${c.job_demand}.`
  }).join('\n')

  return `${BASE_SYSTEM_PROMPT}

CONTEXTO: Este usuario describió sus intereses como: "${careersContext.query}".
La IA le recomendó estas 3 carreras:
${careersList}

Usa este contexto para personalizar. Puedes profundizar, comparar, o guiar según lo que pregunte.`
}

// ── helpers ───────────────────────────────────────────────
// Carga aliases desde JSON — edita utils/institution-aliases.json para agregar nuevos.
import aliasesData from '~/utils/institution-aliases.json'

const INSTITUTION_ALIASES: Record<string, string> = {}
for (const entry of aliasesData) {
  for (const alias of entry.aliases) {
    INSTITUTION_ALIASES[alias.toLowerCase()] = entry.nombre_oficial
  }
}

/**
 * Reemplaza siglas conocidas por el nombre oficial antes de enviar al LLM.
 * Ordenamos de más largo a más corto para evitar solapamientos (ej: "pucv" antes que "uc").
 */
const SORTED_ALIASES = Object.entries(INSTITUTION_ALIASES)
  .sort(([a], [b]) => b.length - a.length)

const OFFICIAL_INSTITUTIONS = Array.from(
  new Set((aliasesData as Array<{ nombre_oficial: string }>).map(e => e.nombre_oficial).filter(Boolean)),
)
const OFFICIAL_BY_LOWER = new Map(OFFICIAL_INSTITUTIONS.map(n => [n.toLowerCase(), n]))

function resolveInstitutionAliases(text: string): string {
  let result = text
  for (const [alias, full] of SORTED_ALIASES) {
    // Match como palabra completa, case-insensitive.
    // \b en JS solo reconoce [A-Za-z0-9_] como carácter de palabra, lo que aquí
    // nos conviene: todas las siglas son ASCII y no queremos que "uc" matchee
    // dentro de palabras largas. Además escapamos caracteres regex del alias.
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(re, full)
  }
  return result
}

function detectMentionedInstitution(text: string): string | null {
  if (!text) return null
  const lowered = text.toLowerCase()

  // 1) Primero, buscar aliases/siglas conocidas (AIEP, UChile, PUCV, etc.)
  for (const [alias, full] of SORTED_ALIASES) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'i')
    if (re.test(lowered)) return full
  }

  // 2) Luego, buscar nombres oficiales ya resueltos en el texto.
  for (const [nameLower, original] of OFFICIAL_BY_LOWER.entries()) {
    if (lowered.includes(nameLower)) return original
  }
  return null
}

function inferTipoInstitucion(institutionName: string | null): string | null {
  if (!institutionName) return null
  const s = institutionName.toLowerCase()
  if (s.includes('ip ') || s.includes('instituto profesional')) return 'Institutos Profesionales'
  if (s.includes('cft ') || s.includes('centro de formacion tecnica') || s.includes('centro de formación técnica')) {
    return 'Centros de Formación Técnica'
  }
  if (s.includes('universidad')) return 'Universidades'
  return null
}

const MAX_TOOL_ROUNDS = 3
const MAX_USER_TURNS = 6        // últimos 6 turnos user/assistant
const MAX_TOOL_ROUND_HISTORY = 2 // conservar solo últimas 2 rondas de tools

type ChatMsg = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: any
  tool_call_id?: string
  name?: string
}

// Filtra qué tools enviar al LLM según la intención detectada en el último
// mensaje del usuario. Reduce drásticamente los tokens de schema por request.
function pickTools(userMsg: string) {
  const m = (userMsg ?? '').toLowerCase()
  const names = new Set<string>()
  const normalized = m
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  const words = normalized.split(/\s+/).filter(Boolean)

  if (/puntaje|ponderaci|corte|vacante|arancel|matric(u|ú)la\s+anual|jornada|requisito|demre|plan\s+especial|grado|t(i|í)tulo|semestres?|duraci(o|ó)n/.test(m)) {
    names.add('get_program_detail')
    // Sin el código del programa, necesita buscar primero en la BD.
    names.add('search_career_match')
  }
  // Preguntas sobre institución: ubicación, sede, egresados, matrícula, dirección
  if (/donde\s+queda|d(o|ó)nde\s+(est(a|á)|queda|se\s+ubica)|sede|direcci(o|ó)n|casa\s+central|ubicaci(o|ó)n|cu(a|á)ntos\s+(egresaron|titularon|se\s+titularon|graduaron|matriculados)|egresados|graduados/.test(normalized)) {
    names.add('get_institution')
    names.add('search_career_match')
  }
  if (/empleabilidad|sueldo|gana|ingreso|titulad|retenci|matr(i|í)cula\b/.test(m)) {
    names.add('get_career_stats_detailed')
    names.add('get_career_employability_by_institution')
  }
  if (/mejor|top|ranking|mayor|menor|cu(a|á)les\s+son|lista\s+de/.test(m)) {
    names.add('rank_careers')
    names.add('rank_institutions')
  }
  if (/compar(ar|a|e)|versus|\bvs\b|diferencia/.test(m)) {
    names.add('compare_institutions')
    names.add('compare_curriculums')
  }
  if (/universidad|instituto|cft|acreditaci|infraestructura|biblioteca|laboratori|casa\s+central|direcci(o|ó)n|p(a|á)gina\s+web|instituci(o|ó)n|duoc|inacap|usach|udp|uc\b|uchile|uai|unab|udla|umayor|santo\s+tomas|finis|terrae/.test(normalized)) {
    names.add('get_institution')
    names.add('search_career_match')
  }
  if (/malla|ramo|asignatura|curriculum|curr(i|í)culo/.test(m)) {
    names.add('compare_curriculums')
  }
  if (/buscar|encontrar|recomi(e|é)nd|qu(e|é)\s+carrera|oferta/.test(m)) {
    names.add('search_career_match')
  }

  // Si el usuario escribe solo el nombre de una carrera (ej: "ingenieria forestal"),
  // forzamos búsqueda para evitar respuestas sin consultar BD.
  if (
    words.length >= 1
    && words.length <= 6
    && normalized.length <= 60
    && !/[?¡!]/.test(normalized)
    && /(ingenier|tecnico|licenciatura|pedagogia|medicina|derecho|arquitectura|psicologia|enfermeria|forestal|kinesiolog|odontolog|veterinari|contador|nutricion|quimica|biologia|periodismo|agronom)/.test(normalized)
  ) {
    names.add('search_career_match')
  }

  if (!names.size) {
    // Sin intención clara: enviamos solo el set mínimo esencial (no las 11)
    // para que el modelo aún pueda decidir consultar BD si lo necesita,
    // ahorrando ~2k tokens de schema en cada turno.
    const fallback = ['search_career_match', 'get_career_stats_detailed', 'get_institution']
    return (aiTools as readonly any[]).filter(t => fallback.includes(t.function?.name))
  }

  const picked = (aiTools as readonly any[]).filter(t => names.has(t.function?.name))
  return picked.length ? picked : (aiTools as any)
}

// Deja al sistema + últimos N turnos user/assistant.
function trimUserHistory(messages: ChatMsg[]): ChatMsg[] {
  const system = messages.filter(m => m.role === 'system')
  const rest = messages.filter(m => m.role !== 'system')
  const trimmed = rest.slice(-MAX_USER_TURNS * 2)
  return [...system, ...trimmed]
}

// Mantiene en memoria solo las últimas N rondas de tool_calls + resultados.
// Conserva íntegro el flujo user/assistant/system.
function pruneToolHistory(messages: ChatMsg[]): ChatMsg[] {
  const out: ChatMsg[] = []
  const toolRoundIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!
    if (m.role === 'assistant' && m.tool_calls?.length) {
      toolRoundIndices.push(i)
    }
  }
  if (toolRoundIndices.length <= MAX_TOOL_ROUND_HISTORY) return messages

  const keepFrom = toolRoundIndices[toolRoundIndices.length - MAX_TOOL_ROUND_HISTORY]!
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!
    const isToolish = (msg.role === 'assistant' && msg.tool_calls?.length) || msg.role === 'tool'
    if (isToolish) {
      if (i >= keepFrom) out.push(msg)
    } else {
      out.push(msg)
    }
  }
  return out
}

async function callLLM(config: any, messages: ChatMsg[], tools: any) {
  const payload = {
    temperature: 0.7,
    max_tokens: 900,
    messages,
    tools,
    tool_choice: 'auto' as const,
  }

  if (config.githubToken) {
    // Valida que la respuesta del LLM tenga forma utilizable: content con
    // texto O tool_calls bien formadas. Algunos modelos (Llama en GitHub
    // Models) devuelven 200 con payload vacío/malformado; si no validamos,
    // el loop de tool-rounds entra con estado corrupto.
    const isUsable = (data: any) => {
      const msg = data?.choices?.[0]?.message
      if (!msg) return false
      const hasContent = typeof msg.content === 'string' && msg.content.trim().length > 0
      const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0
        && msg.tool_calls.every((tc: any) => tc?.function?.name && typeof tc.function.arguments === 'string')
      return hasContent || hasToolCalls
    }

    // Primer intento: Meta-Llama-3.1-8B-Instruct (rápido y gratuito)
    try {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ model: 'meta/Meta-Llama-3.1-8B-Instruct', ...payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (isUsable(data)) return data
        console.warn('[Chat] GitHub Models (Meta-Llama) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (Meta-Llama) HTTP', res.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (Meta-Llama) error:', e?.message)
    }

    // Segundo intento: GPT-4.1-mini (mayor capacidad, fallback)
    try {
      const res2 = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ model: 'openai/gpt-4.1-mini', ...payload }),
      })
      if (res2.ok) {
        const data = await res2.json()
        if (isUsable(data)) return data
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) devolvió payload inutilizable, fallback...')
      } else {
        console.warn('[Chat] GitHub Models (GPT-4.1-mini) HTTP', res2.status)
      }
    } catch (e: any) {
      console.warn('[Chat] GitHub Models (GPT-4.1-mini) error:', e?.message)
    }
  }

  if (config.groqApiKey) {
    // llama-3.1-8b-instant soporta tool calling si se limita a 1-2 tools y
    // se deshabilitan las llamadas paralelas (parallel_tool_calls: false).
    const groqTools = Array.isArray(tools) ? tools.slice(0, 2) : tools

    // Sanitiza el historial para Groq preservando trazabilidad multi-ronda.
    // Groq llama-3.1-8b-instant SOPORTA el formato OpenAI tool-calling, así que
    // conservamos tool_calls y tool_call_id tal cual. Solo colapsamos casos
    // en los que el historial vendría malformado.
    function sanitizeForGroq(msgs: ChatMsg[]) {
      return msgs.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            tool_call_id: m.tool_call_id,
            name: m.name,
            content: m.content,
          }
        }
        if (m.role === 'assistant' && m.tool_calls?.length) {
          return {
            role: 'assistant' as const,
            content: m.content || '',
            tool_calls: m.tool_calls,
          }
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content }
      })
    }

    // Intento 1: con tools (consulta BD)
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
          temperature: 0.7,
          max_tokens: 700,
          parallel_tool_calls: false,
          messages: sanitizeForGroq(messages),
          tools: groqTools,
          tool_choice: 'auto',
        }),
      })
      if (res.ok) return await res.json()
      const errTxt = await res.text()
      console.warn('[Chat] Groq (tools) error:', res.status, errTxt.slice(0, 200))
    } catch (e: any) {
      console.warn('[Chat] Groq (tools) timeout/network:', e?.message)
    }

    // Intento 2: sin tools (respuesta general, evita errores de schema)
    const GROQ_FALLBACK_SYSTEM = `Eres KoraChile, un asistente de orientación vocacional para Chile.
Responde siempre en español, de forma cálida y motivadora. Sé conciso (2-4 párrafos).
Ayuda al usuario a explorar qué carrera le conviene según sus intereses y habilidades.
Si no tienes datos precisos sobre puntajes o aranceles, dilo honestamente y sugiere revisar el sitio oficial del DEMRE.`

    try {
      const fallbackMsgs = sanitizeForGroq(messages).map(m =>
        m.role === 'system' ? { ...m, content: GROQ_FALLBACK_SYSTEM } : m
      )
      const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 600,
          messages: fallbackMsgs,
        }),
      })
      if (res2.ok) return await res2.json()
      const txt2 = await res2.text()
      console.error('[Chat] Groq (fallback) error:', res2.status, txt2.slice(0, 200))
    } catch (e: any) {
      console.error('[Chat] Groq (fallback) timeout/network:', e?.message)
    }
  }

  return null
}

export default defineEventHandler(async (event) => {
  // Seguridad: exige sesión válida + rate limit.
  await requireAuth(event)

  const config = useRuntimeConfig()
  const body = await readBody(event)
  const { messages, careersContext } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere un array de mensajes.' })
  }
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      throw createError({ statusCode: 400, message: 'Formato de mensaje inválido.' })
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      throw createError({ statusCode: 400, message: 'El rol debe ser user o assistant.' })
    }
    if (msg.content.length > 2000) {
      throw createError({ statusCode: 400, message: 'Mensaje demasiado largo (máx 2000 caracteres).' })
    }
  }

  if (!config.githubToken && !config.groqApiKey) {
    throw createError({ statusCode: 500, message: 'No hay API key configurada. Define APY_GIT (GitHub Models) o GROQ en las variables de entorno.' })
  }

  const systemPrompt = buildSystemPrompt(careersContext)
  const trimmedUser = trimUserHistory([
    { role: 'system', content: systemPrompt },
    ...messages,
  ])
  const conversation: ChatMsg[] = [...trimmedUser]

  // Detectar intención desde el último user msg y filtrar tools disponibles.
  // Resolvemos siglas ANTES de todo: pickTools, cache y retrieval trabajan
  // con el texto ya normalizado ("PUCV" → "Pontificia Universidad Católica de Valparaíso").
  const rawLastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const lastUser = resolveInstitutionAliases(rawLastUser)
  const mentionedInstitution = detectMentionedInstitution(lastUser)
  const mentionedTipoInstitucion = inferTipoInstitucion(mentionedInstitution)
  const tools = pickTools(lastUser)

  const toolsUsed: string[] = []
  let programCards: Array<{
    code: string
    title: string
    institution: string
    semesters: number | null
    cost: number | null
    type: string | null
    region: string | null
    jornada: string | null
    nivel: string | null
    vacantes: number | null
    titulados: number | null
  }> = []

  // ── 1. CACHE SEMÁNTICO + EMBEDDING COMPARTIDO ─────────────────────
  // checkSemanticCache devuelve { hit, embedding } aunque no haya match, para
  // que retrieveContext y saveSemanticCache reutilicen el mismo vector
  // (ahorra 100-200ms por request al evitar 2-3 inferencias del modelo).
  // PERO: si la pregunta menciona una institución específica y un tema con
  // datos numéricos (sueldo, empleabilidad, arancel), saltamos el cache para
  // garantizar siempre ir a la BD. El cache semántico puede confundir AIEP
  // con otra institución similar por embedding.
  const hasInstitution = !!mentionedInstitution
  const isDataQuery = /sueldo|gana|ingreso|salario|arancel|empleabilid|puntaje/i.test(lastUser)
  const skipCache = hasInstitution && isDataQuery

  let sharedEmbedding: number[] | null = null
  if (!skipCache) {
    try {
      const lookup = await checkSemanticCache(lastUser)
      if (lookup) {
        sharedEmbedding = lookup.embedding
        if (lookup.hit) {
          return {
            reply: lookup.hit.answer,
            toolsUsed: ['semantic_cache'],
            programCards: [],
            cached: true,
          }
        }
      }
    } catch (e: any) {
      console.warn('[Chat] cache check skipped:', e?.message)
    }
  }

  // ── 2. RETRIEVAL HÍBRIDO (pgvector) ─────────────────────────────────
  // Buscamos en institutions/career_generic/programs por similitud semántica
  // e inyectamos el top-K como "HECHO VERIFICADO" al system prompt.
  // Esto reemplaza el prefetch con ILIKE (frágil con tildes/sinónimos).
  try {
    const retrieved = await retrieveContext(lastUser, 8, 0.28, sharedEmbedding)
    if (retrieved.length) {
      const ctx = formatContext(retrieved)
      // Insertamos justo después del primer system prompt (no asumimos índice fijo).
      const systemIdx = conversation.findIndex(m => m.role === 'system')
      const insertAt = systemIdx >= 0 ? systemIdx + 1 : 0
      conversation.splice(insertAt, 0, {
        role: 'system',
        content: `DATOS OFICIALES RECUPERADOS (Mineduc/SIES, pgvector):
${ctx}

INSTRUCCIONES:
- Usa SOLO estos datos para responder sobre instituciones, carreras o programas.
- NO inventes sedes, direcciones ni aranceles.
- Si un dato no está arriba, dilo: "no se encuentra en los registros".
- Si el usuario pregunta por otra cosa, puedes llamar tools adicionales.`,
      })
      toolsUsed.push('hybrid_retrieval')
      // NO generamos programCards desde el retrieval — los chunks RAG son para
      // contexto del LLM, no para cards. Las cards solo se generan cuando el LLM
      // llama explícitamente a search_career_match (resultado relevante garantizado).
    }
  } catch (e: any) {
    console.warn('[Chat] retrieval error:', e?.message)
  }

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const pruned = pruneToolHistory(conversation)
    const data = await callLLM(config, pruned, tools)
    if (!data) throw createError({ statusCode: 502, message: 'No se obtuvo respuesta de ningún proveedor de IA. Verifica que APY_GIT (GitHub Models) o GROQ estén configurados correctamente.' })

    const msg = data.choices?.[0]?.message
    if (!msg) throw createError({ statusCode: 502, message: 'Respuesta de IA vacía.' })

    const toolCalls = msg.tool_calls
    if (toolCalls?.length) {
      conversation.push({
        role: 'assistant',
        content: msg.content || '',
        tool_calls: toolCalls,
      })

      const results = await Promise.all(
        toolCalls.map(async (tc: any) => {
          const name = tc.function?.name
          let args: any = {}
          try { args = JSON.parse(tc.function?.arguments ?? '{}') }
          catch (e: any) {
            console.warn('[Chat] tool args parse failed for', name, ':', e?.message)
            args = {}
          }

          // Guardrail: si el usuario mencionó una institución específica, forzar
          // ese contexto en las tools de sueldos/empleabilidad para evitar mezclar
          // resultados de otra IES o nivel.
          if (mentionedInstitution) {
            if (name === 'get_career_employability_by_institution') {
              if (!args.nombre_institucion || typeof args.nombre_institucion !== 'string') {
                args.nombre_institucion = mentionedInstitution
              }
            }
            if (name === 'get_career_stats_detailed') {
              if (!args.tipo_institucion && mentionedTipoInstitucion) {
                args.tipo_institucion = mentionedTipoInstitucion
              }
            }
          }

          toolsUsed.push(name)
          try {
            const result = await runTool(name, args, event)
            if (name === 'search_career_match' && Array.isArray(result?.results)) {
              programCards = result.results.slice(0, 4).map((r: any) => ({
                code: r.program_unique_code,
                title: r.nombre_carrera,
                institution: r.nombre_institucion,
                semesters: typeof r.duracion_formal_semestres === 'number' ? r.duracion_formal_semestres : null,
                cost: typeof r.arancel_anual === 'number' ? r.arancel_anual : null,
                type: r.tipo_institucion ?? null,
                region: r.region ?? null,
                jornada: r.jornada ?? null,
                nivel: r.nivel_carrera ?? null,
                vacantes: typeof r.vacantes_semestre_1 === 'number' ? r.vacantes_semestre_1 : null,
                titulados: typeof r.titulacion_total_2024 === 'number' ? r.titulacion_total_2024 : null,
              }))
            }
            return { tool_call_id: tc.id, name, content: JSON.stringify(result).slice(0, 4000) }
          } catch (e: any) {
            return { tool_call_id: tc.id, name, content: JSON.stringify({ error: e?.message || 'tool failed' }) }
          }
        }),
      )
      for (const r of results) {
        conversation.push({
          role: 'tool',
          tool_call_id: r.tool_call_id,
          name: r.name,
          content: r.content,
        })
      }
      continue
    }

    const reply = msg.content || ''
    if (!reply) throw createError({ statusCode: 502, message: 'La IA devolvió un mensaje vacío.' })

    // ── 3. GUARDAR EN CACHE (fire-and-forget) ─────────────────────────────
    // Solo cacheamos respuestas suficientes (>50 chars) y sin errores obvios.
    // NUNCA cacheamos cuando skipCache=true (pregunta por datos de una IES específica)
    // para evitar que respuestas de AIEP contaminen consultas de DUOC por similitud.
    if (!skipCache && reply.length > 50 && !/lo siento|no tengo|error/i.test(reply.slice(0, 60))) {
      // saveSemanticCache es fire-and-forget pero ya maneja errores
      // internamente con try/catch + console.warn (ver semantic-cache.ts).
      saveSemanticCache(lastUser, reply, {
        tags: toolsUsed,
        volatile: isVolatileAnswer(reply),
        precomputedEmbedding: sharedEmbedding,
      })
    }

    return { reply, toolsUsed, programCards }
  }

  throw createError({ statusCode: 502, message: 'La IA excedió el límite de rondas de herramientas.' })
})
