import { defineStore } from 'pinia'

export interface CareerRoadmapPhase {
  phase: string
  duration: string
  milestones: string[]
}

export interface CareerVariation {
  id: string
  title: string
  tagline: string
  description: string
  emoji: string
  match_score: number
  pros: string[]
  cons: string[]
  skills: string[]
  roadmap: CareerRoadmapPhase[]
}

export interface DiscoveryResult {
  query: string
  summary: string
  variations: CareerVariation[]
}

export interface SavedCareer {
  id: string
  careerId: string
  careerData: CareerVariation
  savedAt: string
  notes: string
}

export interface User {
  id: string
  email: string
  name: string
}

export const useCareerStore = defineStore('career', () => {
  const result = ref<DiscoveryResult | null>(null)
  const sessionId = ref<string | null>(null)
  const selectedCareer = ref<CareerVariation | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const cache = ref<Map<string, { result: DiscoveryResult; sessionId: string }>>(new Map())
  
  // Autenticación
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  
  // Carreras guardadas
  const savedCareers = ref<SavedCareer[]>([])
  
  // Quiz
  const quizAnswers = ref<Record<string, string>>({})

  function setResult(data: DiscoveryResult, id: string) {
    result.value = data
    sessionId.value = id
    const normalized = data.query.toLowerCase().trim()
    cache.value.set(normalized, { result: data, sessionId: id })
  }

  function getFromCache(query: string) {
    const normalized = query.toLowerCase().trim()
    return cache.value.get(normalized)
  }

  function setSelectedCareer(career: CareerVariation) {
    selectedCareer.value = career
  }

  function setLoading(val: boolean) {
    isLoading.value = val
  }

  function setError(msg: string | null) {
    error.value = msg
  }

  function setUser(userData: User | null) {
    user.value = userData
    isAuthenticated.value = !!userData
  }

  function setQuizAnswers(answers: Record<string, string>) {
    quizAnswers.value = answers
  }

  function addSavedCareer(career: CareerVariation, notes: string = '') {
    const saved: SavedCareer = {
      id: crypto.randomUUID(),
      careerId: career.id,
      careerData: career,
      savedAt: new Date().toISOString(),
      notes,
    }
    savedCareers.value.push(saved)
    return saved
  }

  function removeSavedCareer(id: string) {
    savedCareers.value = savedCareers.value.filter(c => c.id !== id)
  }

  function updateSavedCareerNotes(id: string, notes: string) {
    const career = savedCareers.value.find(c => c.id === id)
    if (career) {
      career.notes = notes
    }
  }

  function clear() {
    result.value = null
    sessionId.value = null
    selectedCareer.value = null
    error.value = null
  }

  return {
    result,
    sessionId,
    selectedCareer,
    isLoading,
    error,
    cache,
    user,
    isAuthenticated,
    savedCareers,
    quizAnswers,
    setResult,
    getFromCache,
    setSelectedCareer,
    setLoading,
    setError,
    setUser,
    setQuizAnswers,
    addSavedCareer,
    removeSavedCareer,
    updateSavedCareerNotes,
    clear,
  }
})
