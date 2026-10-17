import type { ConfigContraEntrega } from '@/services/contraEntregaApi'
import { codigoError, estadoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/** Tope de cordura del campo en #211 (no es regla de negocio): más que esto → 400 `MINIMO_INVALIDO`. */
export const MINIMO_MAXIMO = 100_000_000

/** Convierte el campo «Pedido mínimo» (opcional) a número o null. Devuelve un error si no es válido. */
export function leerMinimo(texto: string): { minimo: number | null; error: string | null } {
  const limpio = texto.replace(/[₡\s.,]/g, '')
  if (!limpio) return { minimo: null, error: null }
  if (!/^\d+$/.test(limpio)) return { minimo: null, error: 'Escribí solo números, sin decimales.' }
  const n = Number(limpio)
  if (n <= 0) return { minimo: null, error: 'El mínimo tiene que ser mayor a cero. Dejalo vacío si no querés mínimo.' }
  if (n > MINIMO_MAXIMO) return { minimo: null, error: 'Ese mínimo es demasiado alto. Revisá el número.' }
  return { minimo: n, error: null }
}

export function configDesdeFormulario(acepta: boolean, minimoTexto: string): { config: ConfigContraEntrega | null; error: string | null } {
  const { minimo, error } = leerMinimo(minimoTexto)
  if (error) return { config: null, error }
  return { config: { acepta, minimo: acepta ? minimo : null }, error: null }
}

export const TEXTO_SOLO_PROPIETARIO_CE = 'Solo la persona dueña del negocio puede configurar la contra entrega.'
export const TEXTO_CE_NO_DISPONIBLE = 'Esta opción todavía no está disponible. Muy pronto vas a poder activarla desde acá.'

/** Errores de `GET/PUT /api/negocio/contra-entrega` (#211). */
export function mensajeErrorContraEntrega(err: unknown, respaldo: string): string {
  const code = codigoError(err)
  if (code === 'SOLO_PROPIETARIO' || estadoError(err) === 403) return TEXTO_SOLO_PROPIETARIO_CE
  if (code === 'MINIMO_INVALIDO') return 'El mínimo tiene que ser un número entero mayor a cero, sin decimales.'
  if (code === 'ACEPTA_INVALIDO') return 'Elegí si aceptás contra entrega o no.'
  return mensajeErrorContrato(err) ?? respaldo
}
