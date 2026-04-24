<template>
  <div>
    <NuxtRouteAnnouncer />

    <!-- Loading gate solo en cliente (evita hydration mismatch).
         Bloquea la UI hasta que el plugin de auth valide sesión con Supabase. -->
    <ClientOnly>
      <Transition name="auth-gate">
        <div
          v-if="!authReady"
          class="fixed inset-0 z-[200] bg-white flex items-center justify-center">
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 rounded-full overflow-hidden shadow ring-2 ring-white">
              <MascotIcon />
            </div>
            <div class="flex gap-1.5">
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 0ms"></span>
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 120ms"></span>
              <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 240ms"></span>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

// Si el plugin ya corrió y hydrated es true (ej: navegación SPA), arrancamos listos.
// Si es F5, hydrated empieza en false y esperamos a que el plugin lo resuelva.
const authReady = computed(() => authStore.hydrated)
</script>

<style>
/* Transición global entre páginas */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Salida del loading gate */
.auth-gate-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.auth-gate-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
