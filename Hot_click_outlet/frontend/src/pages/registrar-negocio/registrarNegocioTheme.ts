/** Acento del registro de negocio: azul b600 del manual (antes rojo translúcido fuera de tokens). */
export const A = { color: 'var(--hc-blue-600)', ring: 'var(--hc-blue-100)', bg: 'var(--hc-blue-50)' }

export type EstadoHaciendaColor = { bg: string; border: string; text: string; label: string }

/** Estados de Hacienda con tokens: éxito #178A50, peligro y neutros (sin la paleta Tailwind suelta). */
export const ESTADO_COLOR: Record<string, EstadoHaciendaColor> = {
  INSCRITO:            { bg: 'var(--hc-success-bg)', border: 'var(--hc-success)', text: 'var(--hc-success-text)', label: 'Inscrito' },
  DESINSCRITO:         { bg: 'var(--hc-danger-bg)', border: 'var(--hc-red-500)', text: 'var(--hc-n-900)', label: 'Desinscrito' },
  NO_INSCRITO:         { bg: 'var(--hc-n-100)', border: 'var(--hc-n-200)', text: 'var(--hc-n-600)', label: 'No inscrito' },
  NO_ENCONTRADO:       { bg: 'var(--hc-n-100)', border: 'var(--hc-n-200)', text: 'var(--hc-n-600)', label: 'No encontrado' },
  SERVICIO_NO_DISPONIBLE: { bg: 'var(--hc-warning-bg)', border: 'var(--hc-warning)', text: 'var(--hc-n-900)', label: 'Servicio no disponible' },
}
