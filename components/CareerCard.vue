<template>
  <div
    class="card overflow-hidden group hover:shadow-card-hover transition-all duration-300">
    <div class="p-6">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
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
          class="p-2 rounded-lg transition-colors shrink-0"
          :class="isSaved ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'hover:bg-slate-100 text-slate-400'"
          :title="isSaved ? 'Carrera guardada' : 'Guardar carrera'">
          <svg class="w-5 h-5" :fill="isSaved ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
          </svg>
        </button>
      </div>

      <p class="text-sm text-slate-600 leading-relaxed line-clamp-3">{{ career.description }}</p>

      <div class="mt-3 flex items-center gap-2">
        <div class="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700"
            style="background: linear-gradient(90deg, #1A73E8, #06b6d4)"
            :style="{ width: `${career.match_score}%` }">
          </div>
        </div>
        <span class="text-xs font-bold text-primary-600 w-8">{{ career.match_score }}%</span>
      </div>

      <div class="mt-4 flex flex-wrap gap-1.5">
        <SkillPill v-for="skill in career.skills.slice(0, 4)" :key="skill" :skill="skill" />
        <span v-if="career.skills.length > 4" class="tag bg-slate-50 text-slate-400 text-xs">+{{ career.skills.length - 4 }}</span>
      </div>

      <button
        class="mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary-50 text-primary-600 font-medium hover:bg-primary-100 transition-colors text-sm"
        @click="goToRoadmap">
        <span>Ver roadmap detallado</span>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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

const isSaved = computed(() =>
  store.savedCareers.some(c => c.careerData.id === props.career.id)
)

function toggleSave() {
  if (isSaved.value) {
    const saved = store.savedCareers.find(c => c.careerData.id === props.career.id)
    if (saved) {
      store.removeSavedCareer(saved.id)
    }
  } else {
    store.addSavedCareer(props.career)
  }
}

function goToRoadmap() {
  store.setSelectedCareer(props.career)
  router.push(`/results/${store.sessionId}/${props.career.id}`)
}
</script>
