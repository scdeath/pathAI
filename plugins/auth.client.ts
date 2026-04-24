/**
 * Plugin cliente: hidrata el store de auth una sola vez al cargar la app
 * y escucha cambios de sesión de Supabase para mantenerlo sincronizado.
 */
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  const supabase = useSupabaseClient()

  // Hidratar al arranque
  await auth.ensureHydrated()

  // Mantener sincronizado con cambios de sesión de Supabase
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      auth.clear()
      return
    }
    // Forzar re-fetch del perfil (rol puede haber cambiado)
    auth.ensureHydrated(true)
  })
})
