<template>
  <div
    class="card overflow-hidden group cursor-default"
    :class="visible ? 'animate-scale-in' : 'opacity-0'"
    ref="cardRef">
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
            style="background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%)">
            {{ career.emoji }}
          </div>
          <div>
            <h3 class="font-bold text-slate-900 text-lg leading-tight">{{ career.title }}</h3>
            <p class="text-sm text-slate-500 mt-0.5 leading-snug">{{ career.tagline }}</p>
          </div>
        </div>

        <button
          @click.prevent="toggleSave"
          class="p-2 rounded-lg transition-all duration-200 shrink-0 active:scale-90"
          :class="isSaved ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'hover:bg-slate-100 text-slate-400'"
          :title="isSaved ? 'Carrera guardada' : 'Guardar carrera'">
          <svg class="w-5 h-5 transition-transform duration-200" :class="isSaved ? 'scale-110' : ''" :fill="isSaved ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
          </svg>
        </button>
      </div>

      <p class="text-sm text-slate-600 leading-relaxed line-clamp-3">{{ career.description }}</p>

      <!-- Barra de compatibilidad animada -->
      <div class="mt-4">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-slate-400 font-medium">Compatibilidad</span>
          <span class="text-xs font-bold text-primary-600">{{ career.match_score }}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000 ease-out"
            style="background: linear-gradient(90deg, #1A73E8, #06b6d4)"
            :style="{ width: visible ? `${career.match_score}%` : '0%' }">
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="mt-4 flex flex-wrap gap-1.5">
        <SkillPill
          v-for="(skill, i) in career.skills.slice(0, 4)"
          :key="skill"
          :skill="skill"
          class="animate-fade-in"
          :style="{ animationDelay: `${i * 60}ms` }" />
        <span v-if="career.skills.length > 4" class="tag bg-slate-50 text-slate-400 text-xs">+{{ career.skills.length - 4 }}</span>
      </div>

      <!-- CTA -->
      <button
        class="mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-50 text-primary-600 font-medium hover:bg-primary-100 active:scale-[0.98] transition-all duration-200 text-sm group/btn"
        @click="goToRoadmap">
        <span>Ver roadmap detallado</span>
        <svg class="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'
import type { CareerVariation } from '~/stores/career'

const props = defineProps<{ career: CareerVariation }>()
const router = useRouter()
const store = useCareerStore()

const cardRef = ref<HTMLElement | null>(null)
const visible = ref(false)

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) { visible.value = true; observer.disconnect() } },
    { threshold: 0.1 }
  )
  if (cardRef.value) observer.observe(cardRef.value)
})

const isSaved = computed(() =>
  store.savedCareers.some(c => c.careerData.id === props.career.id)
)

function toggleSave() {
  if (isSaved.value) {
    const saved = store.savedCareers.find(c => c.careerData.id === props.career.id)
    if (saved) store.removeSavedCareer(saved.id)
  } else {
    store.addSavedCareer(props.career)
  }
}

function goToRoadmap() {
  store.setSelectedCareer(props.career)
  router.push(`/results/${store.sessionId}/${props.career.id}`)
}
</script>
