<template>
  <div class="min-h-screen flex flex-col">
    <DiscoveringModal :visible="store.isLoading" />
    <AppHeader />

    <main class="flex-1 flex flex-col">
      <section class="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-14 sm:pb-16 min-h-screen overflow-hidden">
        <div class="absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #bfdbfe 0%, #a5f3fc 50%, transparent 70%); will-change: auto;">
          </div>
          <div class="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full opacity-10 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #dbeafe 0%, transparent 70%); will-change: auto;">
          </div>
        </div>

        <div class="w-full max-w-3xl mx-auto text-center space-y-7 sm:space-y-8">
          <div class="space-y-4 animate-fade-up">
           

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] sm:leading-tight">
              Encuentra tu
              <span class="gradient-text"> carrera perfecta</span>
            </h1>

            <p class="text-base sm:text-lg lg:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-normal px-1">
              Cuéntanos sobre tus intereses y pasiones. Te mostraremos todas las alternativas de carreras que existen en el país y que conocerás en base a tus gustos.
            </p>
          </div>

          <div class="animate-fade-up animation-delay-200 opacity-0-init" style="animation-fill-mode: forwards">
            <div v-if="!showQuiz" class="space-y-4">
              <SearchBar
                :loading="store.isLoading"
                :error="store.error"
                @submit="handleDiscover" />
              <div class="text-center">
                <button
                  @click="showQuiz = true"
                  class="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  ¿Prefieres responder un quiz? →
                </button>
              </div>
            </div>

            <div v-else class="space-y-4">
              <QuizFlow @complete="handleQuizComplete" />
              <div class="text-center">
                <button
                  @click="showQuiz = false"
                  class="text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors">
                  ← Volver a búsqueda libre
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
 

      <!-- Preview section -->
      <section class="px-4 sm:px-6 py-16 sm:py-20 bg-white border-t border-slate-100 overflow-hidden">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-14">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 border border-accent-100 text-accent-700 text-xs font-semibold uppercase tracking-wider mb-4">
              Vista previa
            </span>
            <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Así lucen tus resultados</h2>
            <p class="text-slate-500 mt-2 max-w-md mx-auto">Carreras personalizadas con roadmap, sueldos reales y libros recomendados.</p>
          </div>

          <!-- Floating preview cards -->
          <div class="relative flex flex-col md:flex-row gap-6 items-stretch justify-center">
            <div v-for="(card, i) in previewCards" :key="i"
              class="relative flex-1 max-w-xs bg-white rounded-3xl border border-slate-100 shadow-card p-6 space-y-4 transition-transform duration-500 hover:-translate-y-2"
              :style="`transform: translateY(${card.offset}px)`">
              <!-- Match badge -->
              <div class="flex items-start justify-between">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-4xl"
                  :style="`background: ${card.bg}`">
                  {{ card.emoji }}
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="card.demandClass">{{ card.demand }}</span>
                  <div class="flex items-center gap-1">
                    <div class="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div class="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-500" :style="`width:${card.match}%`"></div>
                    </div>
                    <span class="text-xs font-bold text-primary-600">{{ card.match }}%</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-base">{{ card.title }}</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ card.tagline }}</p>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="skill in card.skills" :key="skill"
                  class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
                  {{ skill }}
                </span>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-slate-50">
                <div>
                  <p class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Sueldo junior</p>
                  <p class="text-sm font-bold text-slate-800">{{ card.salary }}</p>
                </div>
                <div class="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                  <svg class="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section class="px-4 sm:px-6 py-16 sm:py-20 bg-surface-50 border-t border-slate-100">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-4">
              Usuarios reales
            </span>
            <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Lo que dicen sobre KoraChile</h2>
            <p class="text-slate-500 mt-2">Jóvenes chilenos que encontraron su camino</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="(review, i) in testimonials" :key="i"
              class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4 flex flex-col">
              <!-- Stars -->
              <div class="flex gap-0.5">
                <svg v-for="s in 5" :key="s" class="w-4 h-4" :class="s <= review.stars ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <p class="text-sm text-slate-700 leading-relaxed flex-1">"{{ review.text }}"</p>
              <div class="flex items-center gap-3 pt-2 border-t border-slate-50">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  :style="`background: ${review.avatarColor}`">
                  {{ review.initials }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ review.name }}</p>
                  <p class="text-xs text-slate-400">{{ review.role }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Average rating -->
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-card">
            <div class="text-center">
              <p class="text-5xl font-extrabold text-slate-900">4.9</p>
              <div class="flex gap-0.5 justify-center mt-1">
                <svg v-for="s in 5" :key="s" class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <p class="text-xs text-slate-400 mt-1">Promedio general</p>
            </div>
            <div class="hidden sm:block w-px h-16 bg-slate-100"></div>
            <div class="flex gap-8 text-center">
              <div>
                <p class="text-2xl font-bold text-slate-900">+2.400</p>
                <p class="text-xs text-slate-400 mt-1">Usuarios activos</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">+7.200</p>
                <p class="text-xs text-slate-400 mt-1">Carreras descubiertas</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">98%</p>
                <p class="text-xs text-slate-400 mt-1">Lo recomendarían</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-white border-t border-slate-100 mt-0">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
          <!-- Brand -->
          <div class="md:col-span-2 space-y-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 shrink-0">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                  <defs>
                    <linearGradient id="fLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#1A73E8"/>
                      <stop offset="100%" stop-color="#0891b2"/>
                    </linearGradient>
                  </defs>
                  <circle cx="16" cy="16" r="15" fill="url(#fLogoGrad)"/>
                  <polygon points="16,4 18.2,16 16,14.5" fill="white"/>
                  <polygon points="16,28 13.8,16 16,17.5" fill="white" fill-opacity="0.3"/>
                  <circle cx="16" cy="16" r="1.8" fill="white"/>
                </svg>
              </div>
              <span class="font-bold text-slate-900 text-lg tracking-tight">KoraChile</span>
            </div>
            <p class="text-sm text-slate-500 leading-relaxed max-w-sm">
              Orientación vocacional para Chile con datos oficiales de Mineduc/SIES e inteligencia artificial.
              Gratis, privado y sin publicidad.
            </p>
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Datos SIES 2025-2026
              </span>
            </div>
          </div>

          <!-- Producto -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Producto</h4>
            <ul class="space-y-2 text-sm">
              <li><NuxtLink to="/" class="text-slate-600 hover:text-primary-600 transition-colors">Descubrir carrera</NuxtLink></li>
              <li><NuxtLink to="/explore" class="text-slate-600 hover:text-primary-600 transition-colors">Explorar</NuxtLink></li>
              <li><NuxtLink to="/compare" class="text-slate-600 hover:text-primary-600 transition-colors">Comparar</NuxtLink></li>
              <li><NuxtLink to="/chat" class="text-slate-600 hover:text-primary-600 transition-colors">Chat con Kora</NuxtLink></li>
            </ul>
          </div>

          <!-- Recursos -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Recursos</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="https://www.mifuturo.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">MiFuturo.cl</a></li>
              <li><a href="https://www.mineduc.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">Mineduc</a></li>
              <li><a href="https://acceso.mineduc.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">Acceso a la educación</a></li>
              <li><NuxtLink to="/#how-it-works" class="text-slate-600 hover:text-primary-600 transition-colors">Cómo funciona</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div class="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {{ new Date().getFullYear() }} KoraChile · Hecho en Chile 🇨🇱</span>
          <span>Fuente de datos: Mineduc / SIES · Uso responsable — la IA puede equivocarse.</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'

useHead({
  title: 'KoraChile — Descubre Tu Carrera',
  meta: [
    { name: 'description', content: 'Plataforma de descubrimiento de carrera para Chile, impulsada por IA. Describe tus intereses y obtén hojas de ruta de carrera personalizadas para el mercado chileno.' }
  ]
})

const router = useRouter()
const store = useCareerStore()

const SearchBar = defineAsyncComponent(() => import('~/components/discovery/SearchBar.vue'))
const QuizFlow = defineAsyncComponent(() => import('~/components/discovery/QuizFlow.vue'))
const DiscoveringModal = defineAsyncComponent(() => import('~/components/discovery/DiscoveringModal.vue'))

const showQuiz = ref(false)

const steps = [
  {
    icon: 'profile',
    title: 'Describe tu perfil',
    desc: 'Cuéntanos sobre tus intereses, habilidades y qué te emociona en la vida.',
  },
  {
    icon: 'ai',
    title: 'IA analiza',
    desc: 'Nuestra IA procesa tu perfil y genera 3 carreras personalizadas para Chile.',
  },
  {
    icon: 'roadmap',
    title: 'Obtén tu roadmap',
    desc: 'Explora ventajas, sueldos reales en CLP, libros y plan de acción paso a paso.',
  },
]

const previewCards = [
  {
    emoji: '💻',
    title: 'Desarrollador Full Stack',
    tagline: 'Construye productos digitales de principio a fin',
    match: 94,
    demand: '🔥 Muy Alta',
    demandClass: 'bg-emerald-100 text-emerald-700',
    skills: ['JavaScript', 'Node.js', 'React', 'SQL'],
    salary: '$900.000 CLP',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    offset: 0,
  },
  {
    emoji: '🎨',
    title: 'Diseñador UX/UI',
    tagline: 'Crea experiencias digitales que la gente ama',
    match: 87,
    demand: '🔥 Alta',
    demandClass: 'bg-blue-100 text-blue-700',
    skills: ['Figma', 'Research', 'Prototipado'],
    salary: '$800.000 CLP',
    bg: 'linear-gradient(135deg, #fdf4ff, #fae8ff)',
    offset: -20,
  },
  {
    emoji: '📊',
    title: 'Analista de Datos',
    tagline: 'Transforma datos en decisiones de negocio',
    match: 81,
    demand: '🔥 Muy Alta',
    demandClass: 'bg-emerald-100 text-emerald-700',
    skills: ['Python', 'SQL', 'Power BI', 'Excel'],
    salary: '$850.000 CLP',
    bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    offset: 10,
  },
]

const testimonials = [
  {
    stars: 5,
    text: 'No sabía qué estudiar después del colegio. KoraChile me mostró que el diseño UX era perfecto para mí. Hoy trabajo en una startup y amo lo que hago.',
    name: 'Valentina R.',
    role: 'Diseñadora UX, 22 años · Santiago',
    initials: 'VR',
    avatarColor: 'linear-gradient(135deg, #a78bfa, #818cf8)',
  },
  {
    stars: 5,
    text: 'Me dio un roadmap concreto con cursos en Chile. En 9 meses hice mi portafolio y conseguí mi primer trabajo como desarrollador frontend.',
    name: 'Matías C.',
    role: 'Dev Frontend, 25 años · Concepción',
    initials: 'MC',
    avatarColor: 'linear-gradient(135deg, #34d399, #059669)',
  },
  {
    stars: 5,
    text: 'Tengo 37 años y quería cambiarme de rubro. KoraChile me orientó hacia análisis de datos y los sueldos que mostró eran reales. Ya llevo 6 meses estudiando.',
    name: 'Patricia M.',
    role: 'Reconversión laboral · Viña del Mar',
    initials: 'PM',
    avatarColor: 'linear-gradient(135deg, #fb923c, #f43f5e)',
  },
  {
    stars: 5,
    text: 'Lo que más me gustó fue el test de personalidad MBTI integrado. Me ayudó a confirmar que soy INTJ y que la ingeniería de datos va perfecto con mi forma de pensar.',
    name: 'Diego A.',
    role: 'Estudiante Ingeniería · La Serena',
    initials: 'DA',
    avatarColor: 'linear-gradient(135deg, #38bdf8, #1A73E8)',
  },
  {
    stars: 5,
    text: 'Totalmente gratis y mucho mejor que pagar una orientadora vocacional. Las recomendaciones de libros también fueron muy buenas.',
    name: 'Camila F.',
    role: 'Recién egresada · Temuco',
    initials: 'CF',
    avatarColor: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  },
  {
    stars: 4,
    text: 'Me recomendó ser técnico en electricidad industrial, algo que nunca había considerado. Los sueldos que mostró me sorprendieron gratamente. Muy buena herramienta.',
    name: 'Luis H.',
    role: 'Técnico DUOC · Antofagasta',
    initials: 'LH',
    avatarColor: 'linear-gradient(135deg, #64748b, #334155)',
  },
]

async function handleDiscover(query: string) {
  // Verificar cache primero
  const cached = store.getFromCache(query)
  if (cached) {
    store.setResult(cached.result, cached.sessionId)
    await router.push(`/results/${cached.sessionId}`)
    return
  }

  store.setLoading(true)
  store.setError(null)

  try {
const data = await $fetch<{ sessionId: string; result: any }>('/api/discover', {
  method: 'POST',
  body: { query },
})
    store.setResult(data.result, data.sessionId)
    await router.push(`/results/${data.sessionId ?? 'local'}`)
  } catch (err: any) {
    const message = err?.data?.message || err?.message || 'Algo salió mal. Por favor intenta de nuevo.'
    store.setError(message)
  } finally {
    store.setLoading(false)
  }
}

function handleQuizComplete(result: {
  answers: Record<string, string>
  riasec_scores: Record<string, number>
  holland_code: string
  holland_profile: string[]
  mbti_type: string
  free_text?: string
}) {
  // Guardar respuestas originales por compatibilidad
  store.setQuizAnswers(result.answers)

  // Construir query con el perfil vocacional detectado
  const topScores = Object.entries(result.riasec_scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([letter, score]) => `${letter}=${score}`)
    .join(', ')

  const freeBlock = result.free_text
    ? `\n\nAdemás, la persona cuenta sobre sí:\n"${result.free_text}"\n`
    : ''

  const query = `Perfil vocacional detectado mediante quiz RIASEC + MBTI:

- Código Holland (RIASEC): ${result.holland_code} (${result.holland_profile.join(', ')}).
- Puntajes RIASEC: ${topScores} (escala 0-2 por dimensión).
- Tipo MBTI: ${result.mbti_type}.${freeBlock}

En base a este perfil, recomiéndame 3 carreras u oficios que encajen naturalmente con esta combinación de intereses y personalidad. Prioriza opciones realistas y disponibles en Chile. Considera cómo el código Holland ${result.holland_code} y el tipo ${result.mbti_type} se complementan en cada carrera sugerida${result.free_text ? ', e integra los detalles personales que compartió' : ''}.`

  handleDiscover(query)
}
</script>