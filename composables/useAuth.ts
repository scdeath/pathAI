export function useAuth() {
  const supabase = useSupabaseClient()
  const store = useCareerStore()
  const router = useRouter()

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function signUp(email: string, password: string, name: string) {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })

      if (signUpError) throw signUpError
      if (data.user) {
        store.setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: name,
        })
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Error al registrarse'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (data.user) {
        const name = data.user.user_metadata?.name || email.split('@')[0]
        store.setUser({
          id: data.user.id,
          email: data.user.email || '',
          name,
        })
      }
      return data
    } catch (err: any) {
      error.value = err.message || 'Error al iniciar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function signOut() {
    isLoading.value = true
    error.value = null

    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError

      store.setUser(null)
      await router.push('/')
    } catch (err: any) {
      error.value = err.message || 'Error al cerrar sesión'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function checkAuth() {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      if (data.user) {
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario'
        store.setUser({
          id: data.user.id,
          email: data.user.email || '',
          name,
        })
      }
    } catch (err: any) {
      console.error('Auth check failed:', err.message)
      store.setUser(null)
    }
  }

  return {
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    checkAuth,
  }
}
