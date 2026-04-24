<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-[opacity] duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-[opacity] duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">

        <!-- Floating orbs bg -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div class="orb orb-1"></div>
          <div class="orb orb-2"></div>
          <div class="orb orb-3"></div>
        </div>

        <!-- Card -->
        <div class="relative z-10 w-full max-w-md mx-6 bg-white rounded-[2rem] shadow-2xl px-10 py-12 text-center overflow-hidden">

          <!-- Shimmer top bar -->
          <div class="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem] overflow-hidden">
            <div class="shimmer-bar h-full w-full"></div>
          </div>

          <!-- Icon with pulse rings -->
          <div class="relative flex items-center justify-center mb-8">
            <div class="pulse-ring pulse-ring-1"></div>
            <div class="pulse-ring pulse-ring-2"></div>
            <div class="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-200 animate-float">
              <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
          </div>

          <!-- Main message -->
          <h2 class="text-2xl font-extrabold text-slate-900 leading-snug mb-2">
            Construyendo tu camino<br />
            <span class="gradient-text">perfecto para ti</span>
          </h2>
          <p class="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
            Nuestra IA está analizando tu perfil y diseñando rutas de carrera personalizadas para Chile.
          </p>

          <!-- Animated step text -->
          <div class="h-7 mb-6 flex items-center justify-center">
            <Transition
              mode="out-in"
              enter-active-class="transition-[opacity,transform] duration-300"
              enter-from-class="opacity-0 translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-[opacity,transform] duration-200"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2">
              <span :key="currentStep" class="text-primary-600 font-semibold text-sm">
                {{ steps[currentStep] }}
              </span>
            </Transition>
          </div>

          <!-- Progress dots -->
          <div class="flex items-center justify-center gap-2 mb-6">
            <div
              v-for="(_, i) in steps"
              :key="i"
              class="rounded-full transition-all duration-500"
              :class="i === currentStep
                ? 'w-6 h-2 bg-primary-600'
                : i < currentStep
                  ? 'w-2 h-2 bg-primary-300'
                  : 'w-2 h-2 bg-slate-200'">
            </div>
          </div>

          <!-- Progress bar -->
          <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              style="background: linear-gradient(90deg, #1A73E8, #06b6d4)"
              :style="{ width: `${progressWidth}%` }">
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean }>()

const steps = [
  '✨ Leyendo tus intereses...',
  '🧠 Analizando el mercado laboral chileno...',
  '🗺️ Diseñando rutas personalizadas...',
  '📚 Buscando recursos y universidades...',
  '💡 Preparando tu hoja de ruta...',
  '🚀 ¡Casi listo!',
]

const currentStep = ref(0)
const progressWidth = ref(0)
let stepTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (val) => {
  if (val) {
    currentStep.value = 0
    progressWidth.value = 5
    stepTimer = setInterval(() => {
      if (currentStep.value < steps.length - 1) {
        currentStep.value++
      }
    }, 2200)
    progressTimer = setInterval(() => {
      if (progressWidth.value < 92) {
        progressWidth.value += Math.random() * 4 + 1
      }
    }, 600)
  } else {
    progressWidth.value = 100
    if (stepTimer) { clearInterval(stepTimer); stepTimer = null }
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
    setTimeout(() => {
      currentStep.value = 0
      progressWidth.value = 0
    }, 400)
  }
})

onUnmounted(() => {
  if (stepTimer) clearInterval(stepTimer)
  if (progressTimer) clearInterval(progressTimer)
})
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(135deg, #1A73E8, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Floating icon */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
  will-change: transform;
}

/* Pulse rings */
.pulse-ring {
  position: absolute;
  border-radius: 9999px;
  border: 2px solid #93c5fd;
  animation: pulse-expand 2.5s ease-out infinite;
  will-change: transform, opacity;
}
.pulse-ring-1 { width: 90px; height: 90px; animation-delay: 0s; }
.pulse-ring-2 { width: 120px; height: 120px; animation-delay: 0.8s; }
@keyframes pulse-expand {
  0% { transform: scale(0.9); opacity: 0.6; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* Shimmer top bar */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.shimmer-bar {
  background: linear-gradient(90deg, #1A73E8 0%, #06b6d4 30%, #a855f7 60%, #1A73E8 100%);
  background-size: 200% auto;
  animation: shimmer 2.5s linear infinite;
}

/* Background orbs — sin filter:blur (costo GPU muy alto). Usamos radial-gradient directamente */
.orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.18;
  animation: orb-move 8s ease-in-out infinite alternate;
  will-change: transform;
}
.orb-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
  top: -150px; left: -100px;
  animation-duration: 7s;
}
.orb-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  bottom: -100px; right: -80px;
  animation-duration: 9s;
  animation-delay: -3s;
}
.orb-3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, #a855f7 0%, transparent 70%);
  top: 40%; left: 40%;
  animation-duration: 11s;
  animation-delay: -5s;
}
@keyframes orb-move {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 20px) scale(1.1); }
}
</style>
