import type { Id } from '@/types/api'

export const fmt = (n?: number | null) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

export type EstiloAlerta = { bg: string; color: string; icono: string }

export const ALERTA_STYLE: Record<string, EstiloAlerta> = {
  LIMITE:      { bg: 'rgba(239,68,68,0.1)',    color: '#f87171',  icono: 'alerta' },
  ADVERTENCIA: { bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24',  icono: 'alerta' },
  INFO:        { bg: 'rgba(99,102,241,0.1)',   color: '#818cf8',  icono: 'idea' },
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export type FlagAi = 'chat_publico' | 'copilot_emprendedor'

export type TabAiControl = 'control' | 'consumo'

export type EmpresaAi = {
  id: Id
  nombre?: string
  plan?: string
  llamadas: number
  limite: number
  pct: number
  tokensEntrada: number
  tokensSalida: number
  costoUsd: number
  chatActivo: boolean
  copilotActivo: boolean
}

export type AlertaAi = {
  tipo?: string
  empresaId?: Id
  nombre?: string
  mensaje?: string
}

export type AiDashboard = {
  empresas?: EmpresaAi[]
  alertas?: AlertaAi[]
  costoTotal?: number
  totalLlamadas?: number
}

export const DASHBOARD_VACIO: AiDashboard = {
  empresas: [],
  alertas: [],
  costoTotal: 0,
  totalLlamadas: 0,
}
