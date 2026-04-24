import { useCareerStore } from '~/stores/career'

export default defineNuxtPlugin(() => {
  const store = useCareerStore()
  store.loadSavedCareers()
})
