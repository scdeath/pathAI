<template>
  <div class="w-full max-w-3xl mx-auto">
    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-slate-600">Pregunta {{ currentQuestion + 1 }} de {{ questions.length }}</span>
        <span class="text-xs text-slate-400">{{ progress }}%</span>
      </div>
      <div class="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
        <div class="h-full bg-gradient-to-r from-primary-600 to-accent-500 transition-all duration-500" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Question -->
    <div class="mb-8 space-y-6">
      <div class="animate-fade-in">
        <h2 class="text-2xl font-bold text-slate-900 mb-2">{{ questions[currentQuestion].title }}</h2>
        <p class="text-slate-600">{{ questions[currentQuestion].description }}</p>
      </div>

      <!-- Options -->
      <div class="space-y-3">
        <button
          v-for="(option, idx) in questions[currentQuestion].options"
          :key="idx"
          @click="selectOption(option.value)"
          class="w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left"
          :class="[
            answers[questions[currentQuestion].id] === option.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-200 hover:border-primary-300 bg-white hover:bg-slate-50'
          ]">
          <div class="flex items-center gap-3">
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              :class="[
                answers[questions[currentQuestion].id] === option.value
                  ? 'border-primary-500 bg-primary-600'
                  : 'border-slate-300'
              ]">
              <svg v-if="answers[questions[currentQuestion].id] === option.value" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-slate-900">{{ option.label }}</p>
              <p class="text-xs text-slate-500 mt-0.5">{{ option.hint }}</p>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex gap-3 justify-between">
      <button
        v-if="currentQuestion > 0"
        @click="previousQuestion"
        class="px-6 py-3 rounded-2xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
        ← Anterior
      </button>
      <div v-else></div>

      <button
        v-if="currentQuestion < questions.length - 1"
        @click="nextQuestion"
        :disabled="!answers[questions[currentQuestion].id]"
        class="px-6 py-3 rounded-2xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        Siguiente →
      </button>

      <button
        v-else
        @click="submitQuiz"
        :disabled="!isComplete"
        class="px-8 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        Completar Quiz →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  complete: [answers: Record<string, string>]
}>()

const currentQuestion = ref(0)
const answers = ref<Record<string, string>>({})

const questions = [
  {
    id: 'interests',
    title: '¿Cuáles son tus principales intereses?',
    description: 'Selecciona lo que más te apasiona',
    options: [
      { value: 'tech', label: 'Tecnología & Programación', hint: 'Software, apps, desarrollo digital' },
      { value: 'business', label: 'Negocios & Emprendimiento', hint: 'Marketing, finanzas, gestión' },
      { value: 'creative', label: 'Creatividad & Diseño', hint: 'Arte, diseño, contenido' },
      { value: 'science', label: 'Ciencia & Investigación', hint: 'Datos, análisis, investigación' },
      { value: 'social', label: 'Impacto Social', hint: 'Educación, salud, sostenibilidad' },
    ],
  },
  {
    id: 'experience',
    title: '¿Cuál es tu experiencia actual?',
    description: 'Esto nos ayuda a personalizar el camino',
    options: [
      { value: 'student', label: 'Estudiante', hint: 'Actualmente en institución educativa' },
      { value: 'junior', label: 'Junior (0-2 años)', hint: 'Poco tiempo en el campo laboral' },
      { value: 'mid', label: 'Mid-level (2-5 años)', hint: 'Experiencia moderada' },
      { value: 'senior', label: 'Senior (5+ años)', hint: 'Experiencia significativa' },
      { value: 'career-change', label: 'Cambio de carrera', hint: 'Viniendo de otra área' },
    ],
  },
  {
    id: 'learning-style',
    title: '¿Cómo prefieres aprender?',
    description: 'Conocer tu estilo optimiza el aprendizaje',
    options: [
      { value: 'hands-on', label: 'Aprender haciendo', hint: 'Proyectos prácticos desde el inicio' },
      { value: 'structured', label: 'Estructura. & Teoría', hint: 'Fundamentos sólidos primero' },
      { value: 'self-paced', label: 'A tu ritmo', hint: 'Flexibilidad sin seguimientos' },
      { value: 'mentorship', label: 'Con mentoría', hint: 'Guía de expertos' },
      { value: 'mix', label: 'Mezcla de todo', hint: 'Diverso según necesidad' },
    ],
  },
  {
    id: 'salary-focus',
    title: '¿Cuán importante es el salario?',
    description: 'Nos ayuda a sugerir carreras realistas',
    options: [
      { value: 'high-priority', label: 'Muy importante', hint: 'Busco máximos ingresos' },
      { value: 'moderate', label: 'Moderadamente importante', hint: 'Balance vida-trabajo-dinero' },
      { value: 'low-priority', label: 'Menos importante', hint: 'Prioridad: pasión & impacto' },
      { value: 'flexible', label: 'Depende de otros factores', hint: 'Flexible según contexto' },
    ],
  },
  {
    id: 'timeline',
    title: '¿En cuánto tiempo quieres comenzar?',
    description: 'Para ajustar la intensidad del plan',
    options: [
      { value: 'asap', label: 'ASAP (menos de 3 meses)', hint: 'Quiero comenzar inmediatamente' },
      { value: '3-6m', label: '3-6 meses', hint: 'Plazo moderado' },
      { value: '6-12m', label: '6-12 meses', hint: 'Tengo tiempo para prepararme' },
      { value: 'no-rush', label: 'Sin prisa', hint: 'Flexible con la duración' },
    ],
  },
]

const progress = computed(() => Math.round(((currentQuestion.value + 1) / questions.length) * 100))
const isComplete = computed(() => questions.every(q => answers.value[q.id]))

function selectOption(value: string) {
  answers.value[questions[currentQuestion.value].id] = value
}

function nextQuestion() {
  if (currentQuestion.value < questions.length - 1) {
    currentQuestion.value++
  }
}

function previousQuestion() {
  if (currentQuestion.value > 0) {
    currentQuestion.value--
  }
}

function submitQuiz() {
  if (isComplete.value) {
    emit('complete', answers.value)
  }
}
</script>
