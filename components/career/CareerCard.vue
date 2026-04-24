<template>
  <div
    class="bg-white rounded-3xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group cursor-pointer"
    :class="visible ? 'animate-scale-in' : 'opacity-0'"
    ref="cardRef"
    @click="goToRoadmap">
    <div class="p-5">
      <!-- Top row: icono + demanda/barra -->
      <div class="flex items-start justify-between gap-3 mb-3">
        <!-- Icono -->
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform duration-300 group-hover:scale-105"
          :style="{ background: iconBg }">
          {{ career.emoji }}
        </div>

        <!-- Demanda + barra -->
        <div class="flex flex-col items-end gap-1 pt-0.5">
          <span v-if="career.job_demand" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
            :class="{
              'bg-emerald-100 text-emerald-700': career.job_demand === 'Muy Alta',
              'bg-blue-100 text-blue-700': career.job_demand === 'Alta',
              'bg-amber-100 text-amber-700': career.job_demand === 'Media',
              'bg-slate-100 text-slate-600': !['Muy Alta','Alta','Media'].includes(career.job_demand),
            }">
            🔥 {{ career.job_demand }}
          </span>
          <div class="flex items-center gap-1.5">
            <div class="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-1000 ease-out"
                style="background: linear-gradient(90deg, #1A73E8, #06b6d4)"
                :style="{ width: visible ? `${career.match_score}%` : '0%' }">
              </div>
            </div>
            <span class="text-xs font-bold text-primary-600">{{ career.match_score }}%</span>
          </div>
        </div>
      </div>

      <!-- Título y tagline -->
      <h3 class="font-bold text-slate-900 text-lg leading-tight">{{ career.title }}</h3>
      <p class="text-sm text-slate-500 mt-1 leading-snug line-clamp-2">{{ career.tagline }}</p>

      <!-- Skills -->
      <div class="mt-3 flex flex-wrap gap-1.5">
        <SkillPill
          v-for="(skill, i) in career.skills.slice(0, 4)"
          :key="skill"
          :skill="skill"
          class="animate-fade-in"
          :style="{ animationDelay: `${i * 50}ms` }" />
        <span v-if="career.skills.length > 4" class="tag bg-slate-50 text-slate-500 border border-slate-200 text-xs">+{{ career.skills.length - 4 }}</span>
      </div>

      <!-- Footer: sueldo + flecha -->
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Sueldo Junior</p>
          <p class="text-base font-bold text-slate-900 mt-0.5">
            {{ career.salary_range?.junior ? `$${career.salary_range.junior.toLocaleString('es-CL')} CLP` : '—' }}
          </p>
        </div>
        <div class="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
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

const iconBg = computed(() => {
  const palettes = [
    'linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%)',
    'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
    'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  ]
  const idx = props.career.id ? parseInt(props.career.id, 10) % palettes.length : 0
  return palettes[isNaN(idx) ? 0 : idx]
})

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

function goToRoadmap() {
  store.setSelectedCareer(props.career)
  router.push(`/results/${store.sessionId}/${props.career.id}`)
}
</script>
