<template>
  <div class="w-full space-y-8">
    <!-- Selector de carreras -->
    <div class="space-y-4">
      <label class="block text-sm font-medium text-slate-700">Selecciona hasta 3 carreras para comparar</label>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(career, idx) in availableCareers" :key="idx" class="relative">
          <input
            type="checkbox"
            :id="`career-${idx}`"
            :checked="selected.includes(career.id)"
            @change="toggleCareer(career.id)"
            :disabled="selected.length >= 3 && !selected.includes(career.id)"
            class="sr-only"
          />
          <label
            :for="`career-${idx}`"
            class="flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all"
            :class="[
              selected.includes(career.id)
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-primary-300 bg-white hover:bg-slate-50'
            ]">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center"
              :class="[
                selected.includes(career.id)
                  ? 'border-primary-500 bg-primary-600'
                  : 'border-slate-300'
              ]">
              <svg v-if="selected.includes(career.id)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-slate-900">{{ career.title }}</p>
              <p class="text-xs text-slate-500">{{ career.tagline }}</p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Tabla Comparativa -->
    <div v-if="selected.length > 0" class="space-y-6">
      <!-- Desktop Table -->
      <div class="hidden lg:block overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="text-left py-4 px-4 font-semibold text-slate-900 bg-slate-50">Criterio</th>
              <th v-for="careerData in selectedCareersData" :key="careerData.id" class="text-center py-4 px-4 font-semibold text-slate-900 bg-slate-50">
                <div class="text-2xl mb-2">{{ careerData.emoji }}</div>
                {{ careerData.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Salario -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Salario Promedio</td>
              <td v-for="careerData in selectedCareersData" :key="`salary-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-emerald-600">{{ formatSalary(getMarketData(careerData.id).salary.avg) }}</p>
                <p class="text-xs text-slate-500 mt-1">
                  {{ formatSalary(getMarketData(careerData.id).salary.min) }} - {{ formatSalary(getMarketData(careerData.id).salary.max) }}
                </p>
              </td>
            </tr>

            <!-- Match Score -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Compatibilidad</td>
              <td v-for="careerData in selectedCareersData" :key="`match-${careerData.id}`" class="text-center py-4 px-4">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${careerData.match_score}%` }"></div>
                  </div>
                  <span class="font-bold text-primary-600 w-8">{{ careerData.match_score }}%</span>
                </div>
              </td>
            </tr>

            <!-- Demanda Laboral -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Demanda Laboral</td>
              <td v-for="careerData in selectedCareersData" :key="`demand-${careerData.id}`" class="text-center py-4 px-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" :class="getDemandColor(getMarketData(careerData.id).demand)">
                  {{ getDemandLabel(getMarketData(careerData.id).demand) }}
                </span>
              </td>
            </tr>

            <!-- Crecimiento Anual -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Crecimiento Anual</td>
              <td v-for="careerData in selectedCareersData" :key="`growth-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-blue-600">+{{ getMarketData(careerData.id).growth }}%</p>
              </td>
            </tr>

            <!-- Empleos Disponibles -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Empleos Disponibles</td>
              <td v-for="careerData in selectedCareersData" :key="`jobs-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-slate-900">{{ getMarketData(careerData.id).jobsAvailable.toLocaleString() }}</p>
              </td>
            </tr>

            <!-- Principales empresas -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Empresas que contratan</td>
              <td v-for="careerData in selectedCareersData" :key="`companies-${careerData.id}`" class="text-center py-4 px-4">
                <div class="flex flex-wrap gap-1 justify-center">
                  <span v-for="company in getMarketData(careerData.id).companies.slice(0, 3)" :key="company" class="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                    {{ company }}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Duración estimada -->
            <tr class="border-b border-slate-100 hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Duración Estimada</td>
              <td v-for="careerData in selectedCareersData" :key="`duration-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-slate-900">{{ estimatedMonths(careerData) }} meses</p>
              </td>
            </tr>

            <!-- Número de habilidades -->
            <tr class="hover:bg-slate-50">
              <td class="py-4 px-4 font-medium text-slate-900">Habilidades a aprender</td>
              <td v-for="careerData in selectedCareersData" :key="`skills-${careerData.id}`" class="text-center py-4 px-4">
                <p class="font-bold text-slate-900">{{ careerData.skills.length }} skills clave</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="lg:hidden space-y-4">
        <div v-for="careerData in selectedCareersData" :key="careerData.id" class="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
          <div class="flex items-start gap-3">
            <span class="text-3xl">{{ careerData.emoji }}</span>
            <div>
              <h3 class="font-bold text-slate-900">{{ careerData.title }}</h3>
              <p class="text-sm text-slate-500">{{ careerData.tagline }}</p>
            </div>
          </div>

          <div class="space-y-3 border-t border-slate-100 pt-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Salario Promedio</span>
              <p class="font-bold text-emerald-600">{{ formatSalary(getMarketData(careerData.id).salary.avg) }}</p>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Demanda</span>
              <span class="text-xs font-medium">{{ getDemandLabel(getMarketData(careerData.id).demand) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Crecimiento Anual</span>
              <p class="font-bold text-blue-600">+{{ getMarketData(careerData.id).growth }}%</p>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-slate-600">Empleos Disponibles</span>
              <p class="font-bold">{{ getMarketData(careerData.id).jobsAvailable.toLocaleString() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recomendación -->
      <div class="bg-gradient-to-r from-primary-50 to-accent-50 rounded-3xl p-6 border border-primary-200">
        <h3 class="font-bold text-slate-900 mb-2">💡 Recomendación</h3>
        <p class="text-slate-700">
          {{ getBestRecommendation() }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-12 text-slate-500">
      <p>Selecciona carreras para comenzar la comparación</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CareerVariation } from '~/stores/career'
import { getMarketData, formatSalary, getDemandColor, getDemandLabel } from '~/utils/marketData'

interface Props {
  careers: CareerVariation[]
}

const props = defineProps<Props>()

const selected = ref<string[]>([])
const availableCareers = computed(() => props.careers)
const selectedCareersData = computed(() =>
  props.careers.filter(c => selected.value.includes(c.id))
)

function toggleCareer(careerId: string) {
  if (selected.value.includes(careerId)) {
    selected.value = selected.value.filter(id => id !== careerId)
  } else if (selected.value.length < 3) {
    selected.value.push(careerId)
  }
}

function estimatedMonths(career: CareerVariation): number {
  const durations = career.roadmap.map(p => {
    const match = p.duration.match(/(\d+)/)
    return parseInt(match?.[1] || '0')
  })
  return durations.reduce((a, b) => a + b, 0)
}

function getBestRecommendation(): string {
  if (selectedCareersData.value.length === 0) return ''

  const best = selectedCareersData.value.reduce((prev, current) =>
    current.match_score > prev.match_score ? current : prev
  )

  const marketBest = selectedCareersData.value.reduce((prev, current) => {
    const currGrowth = getMarketData(current.id).growth
    const prevGrowth = getMarketData(prev.id).growth
    return currGrowth > prevGrowth ? current : prev
  })

  if (best.id === marketBest.id) {
    return `${best.title} destaca tanto en compatibilidad (${best.match_score}%) como en crecimiento laboral (+${getMarketData(best.id).growth}% anual). Es la opción más estratégica.`
  }

  return `${best.title} es tu mejor match (${best.match_score}%), pero ${marketBest.title} tiene mayor demanda (+${getMarketData(marketBest.id).growth}% anual). Considera tu prioridad: satisfacción o crecimiento laboral.`
}
</script>
