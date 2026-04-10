<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-5xl mx-auto space-y-8">
        <!-- Header -->
        <div class="space-y-4">
          <NuxtLink :to="backLink" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
            <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a resultados
          </NuxtLink>

          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-3xl flex items-center justify-center text-5xl shrink-0 bg-gradient-to-br from-blue-50 to-cyan-50">
              {{ career?.emoji }}
            </div>
            <div>
              <h1 class="text-3xl font-bold text-slate-900">{{ career?.title }}</h1>
              <p class="text-slate-600 mt-2">{{ career?.tagline }}</p>
              <div class="flex items-center gap-3 mt-4">
                <div class="flex items-center gap-1.5">
                  <div class="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${career?.match_score}%` }"></div>
                  </div>
                  <span class="text-sm font-bold text-primary-600">{{ career?.match_score }}%</span>
                </div>
                <span class="text-sm text-slate-500">Compatibilidad</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Descripción -->
        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card">
          <p class="text-lg text-slate-700 leading-relaxed">{{ career?.description }}</p>
        </div>

        <!-- Pros y Cons Preview -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <h3 class="font-bold text-slate-900">Ventajas</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(pro, idx) in career?.pros" :key="idx" class="text-sm text-slate-700 flex items-start gap-2">
                <span class="text-emerald-500 mt-0.5">✓</span>
                {{ pro }}
              </li>
            </ul>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <h3 class="font-bold text-slate-900">Desventajas</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(con, idx) in career?.cons" :key="idx" class="text-sm text-slate-700 flex items-start gap-2">
                <span class="text-amber-500 mt-0.5">⚠</span>
                {{ con }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b border-slate-200">
          <button
            v-for="tab in ['roadmap', 'basico', 'avanzado']"
            :key="tab"
            @click="activeTab = tab"
            class="px-6 py-3 font-medium text-sm transition-colors relative"
            :class="activeTab === tab
              ? 'text-primary-600'
              : 'text-slate-500 hover:text-slate-700'">
            {{ tabLabels[tab] }}
            <div v-if="activeTab === tab" class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 to-accent-500"></div>
          </button>
        </div>

        <!-- Tab Contents -->
        <div class="space-y-8">
          <!-- Roadmap Tab -->
          <template v-if="activeTab === 'roadmap'">
            <div class="space-y-6">
              <div
                v-for="(phase, index) in career?.roadmap"
                :key="index"
                class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer"
                @click="expandedPhase = expandedPhase === index ? null : index">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shrink-0 text-lg font-bold text-primary-600">
                      {{ index + 1 }}
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-slate-900">{{ phase.phase }}</h3>
                      <p class="text-sm text-slate-500 mt-1">{{ phase.duration }}</p>
                    </div>
                  </div>
                  <svg
                    class="w-6 h-6 text-slate-400 transition-transform duration-200 shrink-0 mt-1"
                    :class="expandedPhase === index ? 'rotate-180' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <!-- Milestones -->
                <Transition
                  enter-active-class="transition-all duration-300"
                  enter-from-class="opacity-0 max-h-0 mt-0"
                  enter-to-class="opacity-100 max-h-96 mt-6"
                  leave-active-class="transition-all duration-200"
                  leave-from-class="opacity-100 max-h-96 mt-6"
                  leave-to-class="opacity-0 max-h-0 mt-0">
                  <div v-if="expandedPhase === index" class="overflow-hidden">
                    <div class="border-t border-slate-100 pt-6">
                      <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Hitos principales</h4>
                      <ul class="space-y-3">
                        <li v-for="(milestone, mIdx) in phase.milestones" :key="mIdx" class="flex items-start gap-3">
                          <svg class="w-5 h-5 text-primary-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                          <span class="text-slate-700">{{ milestone }}</span>
                        </li>
                      </ul>

                      <!-- Institutos/Cursos -->
                      <div class="mt-6 pt-6 border-t border-slate-100 space-y-4">
                        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Cursos recomendados</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div v-for="(course, cIdx) in getCoursesForPhase(index)" :key="cIdx" class="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200">
                            <div class="flex items-start gap-2">
                              <span class="text-lg">📚</span>
                              <div>
                                <p class="font-medium text-slate-800 text-sm">{{ course.title }}</p>
                                <p class="text-xs text-slate-500 mt-1">{{ course.institute }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Unidades -->
                      <div class="mt-6 pt-6 border-t border-slate-100 space-y-4">
                        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Unidades a dominar</h4>
                        <div class="flex flex-wrap gap-2">
                          <span v-for="(unit, uIdx) in getUnitsForPhase(index)" :key="uIdx" class="px-3 py-1.5 rounded-full text-xs font-medium bg-accent-50 text-accent-700 border border-accent-100">
                            {{ unit }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </template>

          <!-- Nivel Básico Tab -->
          <template v-if="activeTab === 'basico'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                v-for="(skill, idx) in basicSkills"
                :key="idx"
                class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card hover:shadow-card-hover transition-all">
                <div class="flex items-start gap-3 mb-3">
                  <span class="text-2xl">{{ skill.emoji }}</span>
                  <h3 class="font-bold text-slate-900 text-lg">{{ skill.name }}</h3>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">{{ skill.description }}</p>
                <div class="mt-4 flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" :style="{ width: `${25 + idx * 10}%` }"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-500">Nivel 1</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Nivel Avanzado Tab -->
          <template v-if="activeTab === 'avanzado'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                v-for="(skill, idx) in advancedSkills"
                :key="idx"
                class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card hover:shadow-card-hover transition-all">
                <div class="flex items-start gap-3 mb-3">
                  <span class="text-2xl">{{ skill.emoji }}</span>
                  <h3 class="font-bold text-slate-900 text-lg">{{ skill.name }}</h3>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">{{ skill.description }}</p>
                <div class="mt-4 flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-amber-500 to-amber-400" :style="{ width: `${70 + idx * 5}%` }"></div>
                  </div>
                  <span class="text-xs font-medium text-slate-500">Avanzado</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- CTA -->
        <div class="bg-gradient-to-r from-primary-600 to-accent-500 rounded-3xl p-8 text-white text-center space-y-4">
          <h3 class="text-2xl font-bold">¿Listo para comenzar?</h3>
          <p class="text-white/90 max-w-xl mx-auto">Sigue este roadmap paso a paso y alcanzarás tu objetivo en {{ estimatedMonths }} meses.</p>
          <div class="flex gap-3 flex-wrap justify-center pt-3">
            <button
              @click="saveCareer"
              class="px-8 py-3 rounded-2xl bg-white text-primary-600 font-bold hover:bg-slate-50 transition-colors"
              :class="{ 'opacity-75': isSaved }">
              {{ isSaved ? '✓ Guardado' : '📌 Guardar Plan' }}
            </button>
            <button
              @click="exportPDF"
              class="px-8 py-3 rounded-2xl border-2 border-white text-white font-bold hover:bg-white/10 transition-colors">
              📥 Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'

const route = useRoute()
const router = useRouter()
const store = useCareerStore()

const activeTab = ref('roadmap')
const expandedPhase = ref<number | null>(null)

const tabLabels: Record<string, string> = {
  roadmap: 'Roadmap Completo',
  basico: 'Nivel Básico',
  avanzado: 'Nivel Avanzado',
}

const career = computed(() => store.selectedCareer)

const backLink = computed(() => `/results/${route.params.sessionId}`)

const estimatedMonths = computed(() => {
  if (!career.value?.roadmap) return 18
  const durations = career.value.roadmap.map(p => {
    const match = p.duration.match(/(\d+)/)
    return parseInt(match?.[1] || '0')
  })
  return durations.reduce((a, b) => a + b, 0)
})

const basicSkills = ref([
  { emoji: '📖', name: 'Fundamentos Teóricos', description: 'Comprensión profunda de conceptos base y principios esenciales.' },
  { emoji: '💻', name: 'Herramientas Básicas', description: 'Manejo de software y plataformas fundamentales de la industria.' },
  { emoji: '🤝', name: 'Soft Skills Iniciales', description: 'Comunicación efectiva, trabajo colaborativo y primeros pasos en equipo.' },
  { emoji: '📚', name: 'Investigación y Documentación', description: 'Capacidad para leer documentación, buscar información y autoaprender.' },
])

const advancedSkills = ref([
  { emoji: '🎯', name: 'Especialización Profesional', description: 'Dominio profundo en áreas específicas y desarrollo de expertise.' },
  { emoji: '🏆', name: 'Proyectos Complejos', description: 'Liderazgo en proyectos grandes, arquitectura y decisiones técnicas.' },
  { emoji: '🔬', name: 'Innovación y Investigación', description: 'Contribución a avances en el campo, investigación independiente.' },
  { emoji: '🌍', name: 'Mentoría y Liderazgo', description: 'Guía de equipos, contribución a comunidades y desarrollo de talentos.' },
])

function getCoursesForPhase(phaseIndex: number) {
  const coursesByPhase = [
    [
      { title: 'Fundamentos — Conceptos Clave', institute: 'Coursera' },
      { title: 'Introducción Práctica', institute: 'Udemy' },
    ],
    [
      { title: 'Desarrollo Intermedio', institute: 'LinkedIn Learning' },
      { title: 'Proyecto Práctico Integrador', institute: 'Codecademy' },
    ],
    [
      { title: 'Especialización Avanzada', institute: 'Pluralsight' },
      { title: 'Estándares de la Industria', institute: 'edX' },
    ],
  ]
  return coursesByPhase[phaseIndex] || []
}

function getUnitsForPhase(phaseIndex: number) {
  const unitsByPhase = [
    ['Conceptos', 'Teoría', 'Básicos', 'Fundamentos'],
    ['Práctica', 'Aplicación', 'Integración', 'Proyecto'],
    ['Especialización', 'Optimización', 'Liderazgo', 'Industria'],
  ]
  return unitsByPhase[phaseIndex] || []
}

const isSaved = computed(() =>
  store.savedCareers.some(c => c.careerData.id === career.value?.id)
)

function saveCareer() {
  if (!career.value) return
  
  if (isSaved.value) {
    const saved = store.savedCareers.find(c => c.careerData.id === career.value?.id)
    if (saved) {
      store.removeSavedCareer(saved.id)
    }
  } else {
    store.addSavedCareer(career.value)
  }
}

async function exportPDF() {
  if (!career.value) return
  const { exportRoadmapToPDF } = await import('~/utils/exportPDF')
  exportRoadmapToPDF(career.value)
}

onBeforeMount(() => {
  // Valida que exista la carrera seleccionada
  if (!career.value) {
    // Intenta obtenerla del resultado almacenado
    if (store.result?.variations) {
      const foundCareer = store.result.variations.find(c => c.id === route.params.careerId)
      if (foundCareer) {
        store.setSelectedCareer(foundCareer)
        return
      }
    }
    // Si no existe, redirige de vuelta
    router.push(`/results/${route.params.sessionId}`)
  }
})
</script>
