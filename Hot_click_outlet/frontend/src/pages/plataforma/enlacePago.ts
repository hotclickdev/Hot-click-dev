import type { ComisionOnvo, EstadoEnlace } from '@/services/onvoCobroService'

export const MONTO_MIN_CRC = 1000
export const MONTO_MAX_CRC = 10_000_000
export const MOTIVO_MIN = 5
export const MOTIVO_MAX = 200

/** Misma regla que el servidor; el servidor es quien decide, esto solo evita idas y vueltas. */
export function validarEnlace(monto: string, motivo: string): { ok: true; monto: number; motivo: string } | { ok: false; error: string } {
  const limpio = monto.replace(/[\s,.]/g, '')
  if (!/^\d+$/.test(limpio)) return { ok: false, error: 'Escribí el monto en colones, solo números.' }
  const valor = Number(limpio)
  if (valor < MONTO_MIN_CRC || valor > MONTO_MAX_CRC) {
    return { ok: false, error: `El monto debe estar entre ${MONTO_MIN_CRC} y ${MONTO_MAX_CRC} colones.` }
  }
  const m = motivo.trim()
  if (m.length < MOTIVO_MIN || m.length > MOTIVO_MAX) {
    return { ok: false, error: `El motivo debe tener entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres.` }
  }
  return { ok: true, monto: valor, motivo: m }
}

export function etiquetaEstado(estado: EstadoEnlace): { texto: string; tono: 'ok' | 'alerta' | 'neutro' | 'azul' } {
  switch (estado) {
    case 'PAGADO': return { texto: 'Pagado', tono: 'ok' }
    case 'CREADO': return { texto: 'Abierto', tono: 'azul' }
    case 'CANCELADO': return { texto: 'Cancelado', tono: 'neutro' }
    default: return { texto: 'Expirado', tono: 'alerta' }
  }
}

export function resumenComision(c: ComisionOnvo): { texto: string; tono: 'ok' | 'alerta' | 'neutro' } {
  if (!c.tieneCuenta) return { texto: 'Sin cuenta conectada en ONVO', tono: 'neutro' }
  if (c.pendiente) return { texto: 'Pendiente de sincronizar', tono: 'alerta' }
  return { texto: 'Sincronizado', tono: 'ok' }
}

export function pct(valor: number | null | undefined): string {
  return valor == null ? '—' : `${valor.toFixed(2)} %`
}
