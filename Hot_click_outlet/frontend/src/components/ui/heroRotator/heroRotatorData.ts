import type { Id } from '@/types/api'

export type HeroPhaseId = 'chat' | 'products' | 'businesses'

export type HeroPhaseBase = {
  id: HeroPhaseId
  duration: number
  accent: string
  glow: string
}

export type HeroPhase = HeroPhaseBase & {
  label: string
}

/** Campos del convenio que el hero lee del listado público. */
export type Convenio = {
  id?: Id
  nombre?: string
  descripcion?: string | null
  logoUrl?: string | null
}

export const PHASES: HeroPhaseBase[] = [
  {
    id: 'chat',
    duration: 15000,
    accent: 'var(--hc-accent)',
    glow: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
  },
  {
    id: 'products',
    duration: 9000,
    accent: 'var(--hc-accent)',
    glow: 'rgba(23,71,168,0.10)',
  },
  {
    id: 'businesses',
    duration: 9000,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.10)',
  },
]

export const PHASE_LABEL_KEYS: Record<HeroPhaseId, string> = {
  chat: 'hero.phaseChat',
  products: 'hero.phaseProducts',
  businesses: 'hero.phaseBusinesses',
}

export const CIRCUMFERENCE = 2 * Math.PI * 10
