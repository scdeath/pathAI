<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-6xl mx-auto space-y-8">

        <div v-if="loading" class="space-y-8">
          <div class="text-center space-y-3 pt-4">
            <div class="flex justify-center">
              <div class="dot-loader flex items-center gap-1">
                <span class="w-3 h-3"></span>
                <span class="w-3 h-3"></span>
                <span class="w-3 h-3"></span>
              </div>
            </div>
            <p class="text-slate-500 font-medium">Analizando tus intereses con IA...</p>
          </div>
          <LoadingCards />
        </div>

        <div v-else-if="error" class="text-center py-20 space-y-4">
          <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-2xl">⚠️</div>
          <h2 class="text-xl font-bold text-slate-800">Algo salió mal</h2>
          <p class="text-slate-500 max-w-md mx-auto">{{ error }}</p>
          <NuxtLink to="/" class="btn-primary inline-flex">Intentar de nuevo</NuxtLink>
        </div>

        <template v-else-if="result">
          <div class="animate-fade-up space-y-2" style="animation-delay:0ms">
            <div class="flex items-center gap-3">
              <NuxtLink to="/" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
                <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Nueva búsqueda
              </NuxtLink>
            </div>

            <div class="animate-scale-in bg-white rounded-3xl border border-slate-100 shadow-card p-6 sm:p-8" style="animation-delay:80ms">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style="background: linear-gradient(135deg, #1A73E8 0%, #0891b2 100%)">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm text-slate-400 font-medium mb-1">Basado en tus intereses</p>
                  <p class="text-slate-700 font-medium italic">"{{ result.query }}"</p>
                  <p class="text-slate-600 text-sm mt-2 leading-relaxed">{{ result.summary }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="animate-fade-up" style="animation-delay:160ms">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-xl font-bold text-slate-900 tracking-tight">
                Tus carreras recomendadas
              </h2>
              <span class="tag bg-primary-50 text-primary-700 border border-primary-100 text-xs animate-fade-in" style="animation-delay:300ms">
                {{ result.variations?.length }} caminos encontrados
              </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div
                v-for="(career, index) in result.variations"
                :key="career.id"
                :style="{ animationDelay: `${200 + index * 120}ms` }">
                <CareerCard :career="career" />
              </div>
            </div>
          </div>

          <div class="text-center pt-4 animate-fade-in" style="animation-delay:600ms">
            <NuxtLink
              to="/"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-white active:scale-[0.98] transition-all duration-200">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explorar otro camino profesional
            </NuxtLink>
          </div>
        </template>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'
import type { DiscoveryResult } from '~/stores/career'
import { useSupabaseClient } from '~/composables/useSupabaseClient'

const route = useRoute()
const store = useCareerStore()
const supabase = useSupabaseClient()

const id = route.params.id as string

const loading = ref(false)
const error = ref<string | null>(null)
const result = computed<DiscoveryResult | null>(() => store.result)

useHead({
  title: computed(() => result.value ? `OrientaAI — ${result.value.query}` : 'OrientaAI — Resultados'),
})

onMounted(async () => {
  if (store.result && store.sessionId === id) return

  loading.value = true
  error.value = null

  try {
    const { data, error: dbError } = await supabase
      .from('discovery_sessions')
      .select('id, query, result')
      .eq('id', id)
      .maybeSingle()

    if (dbError) throw new Error(dbError.message)
    if (!data) throw new Error('Sesión no encontrada. Es posible que haya expirado.')

    const row = data as { id: string; query: string; result: DiscoveryResult }
    store.setResult(row.result, row.id)
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar los resultados.'
  } finally {
    loading.value = false
  }
})
</script>
