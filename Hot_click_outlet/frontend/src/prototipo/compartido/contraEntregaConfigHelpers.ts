import type { ConfigContraEntrega } from '@/services/contraEntregaApi'

/** Convierte el campo «Pedido mínimo» (opcional) a número o null. Devuelve un error si no es válido. */
export function leerMinimo(texto: string): { minimo: number | null; error: string | null } {
  const limpio = texto.replace(/[₡\s.,]/g, '')
  if (!limpio) return { minimo: null, error: null }
  if (!/^\d+$/.test(limpio)) return { minimo: null, error: 'Escribí solo números, sin decimales.' }
  const n = Number(limpio)
  if (n <= 0) return { minimo: null, error: null }
  return { minimo: n, error: null }
}

export function configDesdeFormulario(acepta: boolean, minimoTexto: string): { config: ConfigContraEntrega | null; error: string | null } {
  const { minimo, error } = leerMinimo(minimoTexto)
  if (error) return { config: null, error }
  return { config: { acepta, minimo: acepta ? minimo : null }, error: null }
}
