<template>
  <span class="tag bg-slate-100 text-slate-700 border border-slate-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-all duration-200 cursor-default">
    {{ skill }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ skill: string }>()
</script>
