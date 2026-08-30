export const COPILOT_CHIPS_FIJOS = [
  { label: 'Inventario', prompt: '¿Cómo está el inventario y el stock crítico?' },
  { label: 'Ventas de hoy', prompt: '¿Cómo van las ventas de hoy?' },
  { label: 'Qué reponer', prompt: 'Qué productos debo reponer' },
  { label: 'Qué no se vende', prompt: 'Qué productos no se venden' },
  { label: 'Armame un reporte', prompt: 'Armame un reporte del negocio de los últimos 30 días' },
  { label: 'Finanzas', prompt: 'Cómo voy de plata: ganancia, margen e IVA de este mes' },
  { label: 'Proyección', prompt: 'Si sigo así 30 días, ¿cuánto vendo y qué debo reponer?' },
  { label: 'Mi marca', prompt: 'Cómo está mi marca en HotClick: bio, visibilidad y fichas' },
  { label: 'Vs catálogo', prompt: 'Cómo voy vs el catálogo público de mi categoría' },
] as const

export type CopilotChipFijo = (typeof COPILOT_CHIPS_FIJOS)[number]
export type CopilotChip = string | { label: string; prompt: string }

export type CopilotMensaje = {
  rol: string
  contenido: string
}

export type CopilotUso = {
  llamadas?: number
  limite?: number
  porcentaje?: number
  habilitado?: boolean
}

export type CopilotProductoInsight = {
  id: number | string
  nombre?: string
  stock?: number
  minimo?: number
  udsVendidas?: number
  diasSinVenta?: string | number
  descuentoSugeridoPct?: number
}

export type CopilotInsights = {
  lentos: CopilotProductoInsight[]
  enRiesgo: CopilotProductoInsight[]
  reponerMas: CopilotProductoInsight[]
}

export type CopilotSseParsed = {
  eventName: string
  text?: string
  error?: string
  done?: boolean
}

export function chipLabel(chip: CopilotChip) {
  return typeof chip === 'string' ? chip : chip.label
}

export function chipPrompt(chip: CopilotChip) {
  return typeof chip === 'string' ? chip : chip.prompt
}

export function parseCopilotSse(line: string, eventName: string): CopilotSseParsed {
  if (line.startsWith('event:')) {
    const name = line.slice(6).trim()
    return { eventName: name, done: name === 'done' }
  }
  if (!line.startsWith('data:')) {
    if (line.trim() === '') return { eventName: 'message' }
    return { eventName }
  }
  const data = line.slice(5).trim()
  if (!data) return { eventName }
  try {
    const parsed = JSON.parse(data) as { error?: string; text?: string }
    if (eventName === 'error' || parsed.error) {
      return { eventName, error: parsed.error || 'Hot no está disponible ahora.' }
    }
    if (parsed.text) return { eventName, text: parsed.text }
  } catch (err: unknown) {
    console.error(err)
  }
  return { eventName }
}

export function mensajeErrorStream(err: unknown) {
  const raw = String(mensajeDeError(err)).toLowerCase()
  if (raw.includes('network') || raw.includes('abort') || raw.includes('chunked')) {
    return 'Se cortó la conexión con Hot. Esperá un segundo y volvé a preguntar.'
  }
  if (raw.includes('429') || raw.includes('rate')) {
    return 'Mandaste muchas consultas seguidas. Esperá un momento.'
  }
  return 'No pude conectar con Hot. Reintentá en un momento.'
}

function mensajeDeError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? '')
  }
  return ''
}

export function textoConsultasRestantes(uso: CopilotUso | null) {
  if (!uso) return ''
  if ((uso.limite as number) < 0) return 'Consultas ilimitadas este mes'
  const quedan = Math.max(0, (uso.limite ?? 0) - (uso.llamadas ?? 0))
  return `Te quedan ${quedan} consultas este mes`
}
