<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <main class="flex-1 flex flex-col">
      <section class="relative flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 min-h-screen overflow-hidden">
        <div class="absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #bfdbfe 0%, #a5f3fc 50%, transparent 70%); will-change: auto;">
          </div>
          <div class="absolute bottom-0 left-0 w-[400px] h-[300px] rounded-full opacity-10 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #dbeafe 0%, transparent 70%); will-change: auto;">
          </div>
        </div>

        <div class="w-full max-w-3xl mx-auto text-center space-y-8">
          <div class="space-y-4 animate-fade-up">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium">
              <div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
              Descubre tu carrera con IA
            </div>

            <h1 class="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Encuentra tu
              <span class="gradient-text"> carrera perfecta</span>
            </h1>

            <p class="text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-normal">
              Cuéntanos sobre tus intereses y pasiones. Nuestra IA generará caminos de carrera personalizados con hojas de ruta paso a paso.
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

      <section id="how-it-works" class="px-6 py-20 bg-surface-50 border-t border-slate-100">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Cómo funciona</h2>
            <p class="text-slate-500 mt-2">Tres pasos hacia tu carrera futura</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              v-for="(step, i) in steps"
              :key="i"
              class="card p-6 text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xl"
                :style="`background: ${step.bg}`">
                {{ step.emoji }}
              </div>
              <div class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold mx-auto">
                {{ i + 1 }}
              </div>
              <h3 class="font-bold text-slate-900">{{ step.title }}</h3>
              <p class="text-sm text-slate-500 leading-relaxed">{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-slate-100 py-8 px-6">
      <div class="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-400">
        <span class="font-medium">PathAI</span>
        <span>Impulsado por Groq AI</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'

useHead({
  title: 'PathAI — Descubre Tu Carrera',
  meta: [
    { name: 'description', content: 'Plataforma de descubrimiento de carrera impulsada por IA. Describe tus intereses y obtén hojas de ruta de carrera personalizadas.' }
  ]
})

const router = useRouter()
const store = useCareerStore()

const SearchBar = defineAsyncComponent(() => import('~/components/SearchBar.vue'))
const QuizFlow = defineAsyncComponent(() => import('~/components/QuizFlow.vue'))

const showQuiz = ref(false)

const steps = [
  {
    emoji: '✍️',
    title: 'Describe tu perfil',
    desc: 'Cuéntanos sobre tus intereses, habilidades y qué te emociona en la vida.',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
  },
  {
    emoji: '🤖',
    title: 'IA analiza',
    desc: 'Groq IA procesa tu perfil y genera 3 carreras personalizadas.',
    bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
  },
  {
    emoji: '🗺️',
    title: 'Obtén tu roadmap',
    desc: 'Explora ventajas, desventajas, habilidades requeridas y plan paso a paso.',
    bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
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
    await router.push(`/results/${data.sessionId}`)
  } catch (err: any) {
    const message = err?.data?.message || err?.message || 'Algo salió mal. Por favor intenta de nuevo.'
    store.setError(message)
  } finally {
    store.setLoading(false)
  }
}

function handleQuizComplete(answers: Record<string, string>) {
  // Guardar respuestas del quiz en el store
  store.setQuizAnswers(answers)

  // Crear una query a partir de las respuestas
  const interests = answers.interests || ''
  const experience = answers.experience || ''
  const learningStyle = answers['learning-style'] || ''
  
  const query = `Intereses: ${interests}, Experiencia: ${experience}, Estilo de aprendizaje: ${learningStyle}. Genérame carreras que encajen con mi perfil.`
  
  handleDiscover(query)
}
</script>