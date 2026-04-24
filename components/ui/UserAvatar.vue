<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2',
      sizeClass,
      borderClass,
    ]"
    :style="parsed.kind === 'emoji' ? { backgroundColor: parsed.bg } : undefined">
    <img
      v-if="parsed.kind === 'url'"
      :src="parsed.url"
      :alt="name || 'avatar'"
      class="w-full h-full object-cover"
      @error="onError" />
    <span v-else-if="parsed.kind === 'emoji'" :class="emojiSize">
      {{ parsed.emoji }}
    </span>
    <span v-else class="font-semibold text-primary-700 bg-primary-100 w-full h-full flex items-center justify-center">
      {{ initial }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { parseAvatar } from '~/utils/avatars'

const props = withDefaults(defineProps<{
  avatar?: string | null
  name?: string | null
  email?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  bordered?: boolean
}>(), {
  size: 'md',
  bordered: false,
})

const failed = ref(false)

const parsed = computed(() => {
  if (failed.value) return { kind: 'none' as const }
  return parseAvatar(props.avatar || undefined)
})

const initial = computed(() =>
  (props.name?.[0] || props.email?.[0] || '?').toUpperCase()
)

const sizeClass = computed(() => ({
  xs: 'w-6 h-6 text-sm',
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-24 h-24 text-4xl',
}[props.size]))

const emojiSize = computed(() => ({
  xs: 'text-sm',
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-5xl',
}[props.size]))

const borderClass = computed(() =>
  props.bordered ? 'border-primary-100' : 'border-transparent'
)

function onError() { failed.value = true }
</script>
