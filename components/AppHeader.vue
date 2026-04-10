<template>
  <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2.5 group">
        <!-- OrientaAI compass logo -->
        <div class="w-8 h-8 shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#1A73E8"/>
                <stop offset="100%" stop-color="#0891b2"/>
              </linearGradient>
              <linearGradient id="needleGrad" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#bfdbfe"/>
              </linearGradient>
            </defs>
            <!-- Background circle -->
            <circle cx="16" cy="16" r="15" fill="url(#logoGrad)"/>
            <!-- Outer ring tick marks -->
            <circle cx="16" cy="16" r="12" stroke="white" stroke-width="0.5" stroke-dasharray="2 3.76" stroke-opacity="0.4" fill="none"/>
            <!-- Compass needle - north (pointing up-right, lit) -->
            <polygon points="16,4 18.2,16 16,14.5" fill="url(#needleGrad)"/>
            <!-- Compass needle - south (pointing down-left, dim) -->
            <polygon points="16,28 13.8,16 16,17.5" fill="white" fill-opacity="0.3"/>
            <!-- Center dot -->
            <circle cx="16" cy="16" r="1.8" fill="white"/>
            <!-- Cardinal N label -->
            <text x="16" y="10.5" text-anchor="middle" font-size="3.2" font-weight="700" fill="white" fill-opacity="0.7" font-family="system-ui">N</text>
          </svg>
        </div>
        <span class="font-bold text-slate-900 text-lg tracking-tight group-hover:opacity-80 transition-opacity">
          OrientaAI
        </span>
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink to="/"
          class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200">
          Explorar
        </NuxtLink>
        <a href="#how-it-works"
          class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200">
          Cómo funciona
        </a>
        <NuxtLink to="/saved-careers"
          class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
          </svg>
          Guardadas
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 20)
</script>
