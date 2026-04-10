<template>
  <div class="w-full max-w-2xl mx-auto">
    <div
      class="relative rounded-3xl transition-all duration-300 bg-white border border-slate-200"
      :class="focused ? 'shadow-search border-primary-300' : 'shadow-card'">
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        :placeholder="placeholder"
        :disabled="loading"
        rows="1"
        class="w-full resize-none px-6 pt-5 pb-4 text-slate-900 text-base placeholder:text-slate-400 bg-transparent rounded-3xl outline-none leading-relaxed font-medium"
        :style="{ minHeight: '100px', maxHeight: '180px' }"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.enter.prevent="handleSubmit"
        @input="autoResize"
      />

      <div class="flex items-center justify-between px-4 pb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">{{ inputValue.length }}/500</span>
          <template v-if="!loading && inputValue.length > 0">
            <button
              type="button"
              class="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
              @click="inputValue = ''">
              Limpiar
            </button>
          </template>
        </div>

        <button
          :disabled="!canSubmit"
          class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          @click="handleSubmit">
          <template v-if="loading">
            <div class="dot-loader flex items-center gap-0.5">
              <span></span><span></span><span></span>
            </div>
            <span>Analizando...</span>
          </template>
          <template v-else>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span>Descubrir</span>
          </template>
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-red-500 text-center animate-fade-in">
      {{ error }}
    </p>

    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 border border-slate-200 hover:border-primary-200 transition-all duration-200"
        @click="useSuggestion(suggestion)">
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  submit: [query: string]
}>()

const props = defineProps<{
  loading?: boolean
  error?: string | null
}>()

const inputValue = ref('')
const focused = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const placeholder = 'Describe tus intereses, habilidades y qué te emociona...\nEj: "Me encanta el diseño, la tecnología y ayudar a resolver problemas"'

const suggestions = [
  'Me encanta la creatividad y la tecnología',
  'Apasionado por datos y patrones',
  'Enfoque en personas y pensamiento estratégico',
  'Construir cosas con código',
  'Ciencia y resolver problemas complejos',
]

const canSubmit = computed(() => !props.loading && inputValue.value.trim().length >= 5)

function autoResize() {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 180)}px`
}

function useSuggestion(s: string) {
  inputValue.value = s
  nextTick(() => autoResize())
  textareaRef.value?.focus()
}

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', inputValue.value.trim())
}
</script>
