// Galeria de avatares con animales. Guardamos el valor como una cadena
// tipo "emoji:🐶:#fde68a" para poder renderizarlo sin cargar imagenes
// externas. Tambien aceptamos URLs normales en avatar_url.

export interface AnimalAvatar {
  id: string
  label: string
  emoji: string
  bg: string // color de fondo tailwind-like
  category: 'perro' | 'gato' | 'otro'
}

export const ANIMAL_AVATARS: AnimalAvatar[] = [
  { id: 'dog-1', label: 'Perrito', emoji: '🐶', bg: '#fde68a', category: 'perro' },
  { id: 'dog-2', label: 'Perro', emoji: '🐕', bg: '#fcd34d', category: 'perro' },
  { id: 'dog-3', label: 'Husky', emoji: '🐺', bg: '#e0e7ff', category: 'perro' },
  { id: 'cat-1', label: 'Gatito', emoji: '🐱', bg: '#fbcfe8', category: 'gato' },
  { id: 'cat-2', label: 'Gato', emoji: '🐈', bg: '#f9a8d4', category: 'gato' },
  { id: 'cat-3', label: 'Gato negro', emoji: '🐈‍⬛', bg: '#cbd5e1', category: 'gato' },
  { id: 'fox', label: 'Zorro', emoji: '🦊', bg: '#fed7aa', category: 'otro' },
  { id: 'panda', label: 'Panda', emoji: '🐼', bg: '#e5e7eb', category: 'otro' },
  { id: 'koala', label: 'Koala', emoji: '🐨', bg: '#e2e8f0', category: 'otro' },
  { id: 'lion', label: 'Leon', emoji: '🦁', bg: '#fef3c7', category: 'otro' },
  { id: 'tiger', label: 'Tigre', emoji: '🐯', bg: '#fed7aa', category: 'otro' },
  { id: 'rabbit', label: 'Conejo', emoji: '🐰', bg: '#fce7f3', category: 'otro' },
  { id: 'bear', label: 'Oso', emoji: '🐻', bg: '#fde68a', category: 'otro' },
  { id: 'frog', label: 'Rana', emoji: '🐸', bg: '#bbf7d0', category: 'otro' },
  { id: 'monkey', label: 'Mono', emoji: '🐵', bg: '#fcd34d', category: 'otro' },
  { id: 'penguin', label: 'Pinguino', emoji: '🐧', bg: '#dbeafe', category: 'otro' },
  { id: 'owl', label: 'Buho', emoji: '🦉', bg: '#e7e5e4', category: 'otro' },
  { id: 'unicorn', label: 'Unicornio', emoji: '🦄', bg: '#f5d0fe', category: 'otro' },
]

export function serializeAnimalAvatar(a: AnimalAvatar): string {
  return `emoji:${a.emoji}:${a.bg}`
}

export function parseAvatar(value?: string | null): {
  kind: 'emoji' | 'url' | 'none'
  emoji?: string
  bg?: string
  url?: string
} {
  if (!value) return { kind: 'none' }
  if (value.startsWith('emoji:')) {
    const parts = value.split(':')
    return { kind: 'emoji', emoji: parts[1] || '🙂', bg: parts[2] || '#e2e8f0' }
  }
  return { kind: 'url', url: value }
}
