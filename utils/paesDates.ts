/**
 * paesDates.ts
 *
 * Tipos, utilidades y datos del calendario PAES.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PARA ACTUALIZAR EL CALENDARIO CADA AÑO:
 *   Edita SOLO el archivo: utils/paes-events.json
 *   Cambia el campo "year" y actualiza el array "events" con las nuevas fechas.
 *   NO es necesario tocar este archivo .ts.
 *
 * Fuente oficial: https://demre.cl/calendario
 * ──────────────────────────────────────────────────────────────────────────
 */

import paesData from './paes-events.json'

export interface PaesEvent {
  id: string
  label: string
  date: string        // ISO 8601 YYYY-MM-DD (primer día si es rango)
  dateEnd?: string    // ISO 8601 último día (si aplica)
  description: string
  type: 'exam' | 'result' | 'registration' | 'deadline' | 'info'
  process: 'regular' | 'invierno' | 'ambos'
  url?: string
}

/** Año del proceso vigente — se lee del JSON */
export const PAES_YEAR: number = paesData.year

/** Eventos del calendario — se leen del JSON */
export const PAES_EVENTS: PaesEvent[] = paesData.events as PaesEvent[]

/** Retorna el próximo evento PAES a partir de hoy */
export function getNextPaesEvent(process?: 'regular' | 'invierno'): PaesEvent | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return PAES_EVENTS
    .filter(e => {
      if (process && e.process !== process && e.process !== 'ambos') return false
      return new Date(e.date) >= today
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null
}

/** Días restantes hasta una fecha ISO */
export function daysUntil(dateIso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateIso)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

/** Color según tipo de evento */
export const PAES_EVENT_COLORS: Record<PaesEvent['type'], string> = {
  exam:         'bg-red-100 text-red-700 border-red-200',
  result:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  registration: 'bg-blue-100 text-blue-700 border-blue-200',
  deadline:     'bg-amber-100 text-amber-700 border-amber-200',
  info:         'bg-slate-100 text-slate-600 border-slate-200',
}

export const PAES_PROCESS_LABELS: Record<PaesEvent['process'], string> = {
  regular:  'PAES Regular',
  invierno: 'PAES Invierno',
  ambos:    'Ambos procesos',
}
