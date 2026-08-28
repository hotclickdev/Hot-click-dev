import type { Id } from '@/types/api'

export type HeroPhaseId = 'chat' | 'products' | 'businesses'

export type HeroPhase = {
  id: HeroPhaseId
  duration: number
  label: string
  accent: string
  glow: string
}

/** Campos del convenio que el hero lee del listado público. */
export type Convenio = {
  id?: Id
  nombre?: string
  descripcion?: string | null
  logoUrl?: string | null
}

export const CHAT_CHIPS = [
  '¿Qué tenés en oferta?',
  'Algo para la sala',
  '¿Cómo funciona el envío?',
]

export const PREGUNTAS = [
  '¿Buscas algo para tu sala de estar?',
  '¿Necesitas un accesorio para la cocina?',
  '¿Algo especial para tu dormitorio?',
  '¿Qué le falta a tu espacio de trabajo en casa?',
  '¿Decoración para el jardín o terraza?',
  '¿Buscas un regalo especial?',
  '¿Organizadores para hacer tu hogar más ordenado?',
  '¿Iluminación o lámpara para tu espacio?',
  '¿Accesorios para hacer tu hogar más cómodo?',
  '¿Algo elegante para el comedor?',
  '¿Artículos para renovar tu baño?',
  '¿Un accesorio tecnológico para casa?',
  '¿Decoración minimalista para tu espacio?',
  '¿Algo práctico para la cocina?',
  '¿Renovás el cuarto de los niños?',
  '¿Qué producto estás buscando hoy?',
  '¿Accesorios para una oficina más productiva?',
  '¿Algo de temporada para el hogar?',
  '¿Muebles o accesorios para la sala?',
  '¿En qué ambiente de tu hogar querés invertir?',
]

export const SUGERENCIAS = [
  'Una silla de madera para sala',
  'Una batidora de mano',
  'Un organizador de ropa',
  'Una silla ergonómica',
  'Macetas decorativas',
  'Una caja de regalo especial',
  'Cajas organizadoras',
  'Una lámpara de escritorio',
  'Cojines y almohadones',
  'Un juego de vajilla',
  'Toallas y accesorios de baño',
  'Un parlante bluetooth',
  'Cuadros y arte para pared',
  'Un set de ollas',
  'Estantes y muebles infantiles',
  'Ver productos en oferta',
  'Un soporte para monitor',
  'Adornos de temporada',
  'Una mesa de centro',
  'Remodelar el dormitorio',
]

export const PHASES: HeroPhase[] = [
  {
    id: 'chat',
    duration: 15000,
    label: 'Asistente',
    accent: 'var(--hc-accent)',
    glow: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
  },
  {
    id: 'products',
    duration: 9000,
    label: 'Destacados',
    accent: 'var(--hc-accent)',
    glow: 'rgba(23,71,168,0.10)',
  },
  {
    id: 'businesses',
    duration: 9000,
    label: 'Emprendimientos',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.10)',
  },
]

export const CIRCUMFERENCE = 2 * Math.PI * 10
