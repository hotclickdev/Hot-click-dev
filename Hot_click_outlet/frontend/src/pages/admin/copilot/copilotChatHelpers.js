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
]

/** @param {string|{label: string, prompt: string}} chip */
export function chipLabel(chip) {
  return typeof chip === 'string' ? chip : chip.label
}

/** @param {string|{label: string, prompt: string}} chip */
export function chipPrompt(chip) {
  return typeof chip === 'string' ? chip : chip.prompt
}

/**
 * @param {string} line
 * @param {string} eventName
 * @returns {{ eventName: string, text?: string, error?: string }}
 */
export function parseCopilotSse(line, eventName) {
  if (line.startsWith('event:')) {
    return { eventName: line.slice(6).trim() }
  }
  if (!line.startsWith('data:')) {
    if (line.trim() === '') return { eventName: 'message' }
    return { eventName }
  }
  const data = line.slice(5).trim()
  if (!data) return { eventName }
  try {
    const parsed = JSON.parse(data)
    if (eventName === 'error' || parsed.error) {
      return { eventName, error: parsed.error || 'El asistente no está disponible.' }
    }
    if (parsed.text) return { eventName, text: parsed.text }
  } catch (err) {
    console.error(err)
  }
  return { eventName }
}
