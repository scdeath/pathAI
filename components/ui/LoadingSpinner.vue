<template>
  <div class="flex flex-col items-center justify-center gap-4 py-12" :class="fullscreen && 'min-h-[60vh]'">
    <div class="relative w-12 h-12">
      <div class="absolute inset-0 rounded-full border-4 border-primary-100"></div>
      <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin"></div>
    </div>
    <p v-if="label" class="text-sm text-slate-500 animate-pulse">{{ label }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label?: string; fullscreen?: boolean }>()
</script>
