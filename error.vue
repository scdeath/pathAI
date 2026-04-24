<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50 flex flex-col">
    <AppHeader />

    <main class="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
      <div class="max-w-xl w-full text-center space-y-6">
        <div class="text-[120px] leading-none font-black bg-gradient-to-br from-primary-500 to-cyan-500 bg-clip-text text-transparent select-none">
          {{ statusCode }}
        </div>

        <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
        <p class="text-slate-500 text-base">{{ description }}</p>

        <div class="flex items-center justify-center gap-3 pt-4">
          <NuxtLink to="/" class="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 transition shadow-sm">
            Ir al inicio
          </NuxtLink>
          <button @click="handleError" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition">
            Volver
          </button>
        </div>

        <div v-if="$route.fullPath" class="text-xs text-slate-400 pt-2">
          <code class="bg-slate-100 px-2 py-0.5 rounded">{{ $route.fullPath }}</code>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

const statusCode = computed(() => props.error?.statusCode ?? 500)

const title = computed(() => {
  switch (statusCode.value) {
    case 400: return 'Solicitud inválida'
    case 401: return 'Debes iniciar sesión'
    case 403: return 'Acceso denegado'
    case 404: return 'Página no encontrada'
    case 500: return 'Error del servidor'
    default:  return 'Algo salió mal'
  }
})

const description = computed(() => {
  switch (statusCode.value) {
    case 400: return 'La información enviada no es válida. Revisa los datos e inténtalo de nuevo.'
    case 401: return 'Necesitas iniciar sesión para acceder a esta sección.'
    case 403: return 'No tienes permisos para ver este contenido.'
    case 404: return 'La página que buscas no existe o fue movida.'
    case 500: return 'Algo falló de nuestro lado. Estamos en eso. Inténtalo en unos minutos.'
    default:  return props.error?.statusMessage || props.error?.message || 'Error inesperado.'
  }
})

function handleError() {
  clearError({ redirect: '/' })
}

useHead({ title: `${statusCode.value} — KoraChile` })
</script>
