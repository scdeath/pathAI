/**
 * Store de catálogo de carreras con cache TTL.
 * Cachea los resultados de /api/careers en localStorage para evitar
 * llamadas repetidas a Supabase al navegar entre páginas.
 * TTL de 15 minutos — los datos del catálogo cambian raramente.
 *
 * Uso:
 *   const catalogStore = useCareerCatalogStore()
 *   const { careers, total } = await catalogStore.fetch({ q: '', category: '', limit: 9, offset: 0 })
 */
import { defineStore } from 'pinia'

export interface CatalogCareer {
  id: string
  slug: string
  title: string
  tagline: string
  emoji: string
  category: string
  skills: string[]
  salary_junior: number | null
  salary_mid: number | null
  salary_senior: number | null
  job_demand: string | null
  match_keywords: string[]
}

export interface CatalogParams {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

interface CacheEntry {
  careers: CatalogCareer[]
  total: number
  cachedAt: number
}

const STORAGE_PREFIX = 'KoraChile:catalog:v1:'
const TTL_MS = 1000 * 60 * 15 // 15 minutos

function cacheKey(params: CatalogParams): string {
  return (
    STORAGE_PREFIX +
    (params.category || 'all') +
    ':' +
    (params.q || '') +
    ':' +
    (params.limit ?? 9) +
    ':' +
    (params.offset ?? 0)
  )
}

function loadCached(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return entry
  } catch {
    return null
  }
}

function persist(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch { /* quota */ }
}

export const useCareerCatalogStore = defineStore('career-catalog', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Devuelve careers y total para los parámetros dados.
   * Usa cache si está disponible, si no llama a la API.
   * Con `force: true` ignora el cache.
   */
  async function fetch(params: CatalogParams = {}, force = false): Promise<{ careers: CatalogCareer[]; total: number }> {
    const key = cacheKey(params)

    if (!force) {
      const cached = loadCached(key)
      if (cached) return { careers: cached.careers, total: cached.total }
    }

    loading.value = true
    error.value = null

    try {
      const qs = new URLSearchParams()
      if (params.q) qs.set('q', params.q)
      if (params.category) qs.set('category', params.category)
      qs.set('limit', String(params.limit ?? 9))
      qs.set('offset', String(params.offset ?? 0))

      const res = await $fetch<{ careers: CatalogCareer[]; total: number }>(
        `/api/careers?${qs.toString()}`
      )

      persist(key, { careers: res.careers, total: res.total, cachedAt: Date.now() })
      return { careers: res.careers, total: res.total }
    } catch (e: any) {
      error.value = e?.message ?? 'Error al cargar carreras'
      return { careers: [], total: 0 }
    } finally {
      loading.value = false
    }
  }

  /** Invalida todo el cache de catálogo */
  function invalidate() {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  }

  return { loading, error, fetch, invalidate }
})
