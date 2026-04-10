<template>
  <div class="space-y-0">
    <div
      v-for="(phase, index) in roadmap"
      :key="index"
      class="relative flex gap-4">
      <div class="flex flex-col items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 transition-all duration-200"
          :class="index === 0
            ? 'bg-primary-600 text-white'
            : index === roadmap.length - 1
              ? 'bg-accent-500 text-white'
              : 'bg-primary-100 text-primary-700 border-2 border-primary-200'">
          {{ index + 1 }}
        </div>
        <div
          v-if="index < roadmap.length - 1"
          class="w-px flex-1 my-1"
          :class="index === 0 ? 'bg-primary-200' : 'bg-slate-200'">
        </div>
      </div>

      <div class="pb-6 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <h4 class="text-sm font-semibold text-slate-800">{{ phase.phase }}</h4>
          <span class="tag bg-slate-100 text-slate-500 text-xs py-0.5 px-2">{{ phase.duration }}</span>
        </div>
        <ul class="space-y-1">
          <li
            v-for="(milestone, mIdx) in phase.milestones"
            :key="mIdx"
            class="flex items-start gap-2 text-sm text-slate-600">
            <svg class="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span>{{ milestone }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CareerRoadmapPhase } from '~/stores/career'
defineProps<{ roadmap: CareerRoadmapPhase[] }>()
</script>
