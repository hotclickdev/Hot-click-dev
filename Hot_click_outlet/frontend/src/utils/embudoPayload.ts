export const PASOS_EMBUDO = ['VISITA', 'PRODUCTO', 'CARRITO', 'CHECKOUT', 'PAGO_INTENTO'] as const

export const MOTIVOS_EMBUDO = [
  'BUSQUEDA_VACIA',
  'ERROR_DATOS',
  'ERROR_ENTREGA',
  'SIN_COMPROBANTE',
  'PAGO_FALLIDO',
  'PAGO_CANCELADO',
] as const

export type PasoEmbudo = (typeof PASOS_EMBUDO)[number]
export type MotivoEmbudo = (typeof MOTIVOS_EMBUDO)[number]

export type PayloadEmbudo = {
  sessionKey: string
  paso: PasoEmbudo
  motivo: string | null
  monto: number | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function motivoBloqueoCheckout(paso: 1 | 2 | 3): MotivoEmbudo {
  if (paso === 1) return 'ERROR_DATOS'
  if (paso === 2) return 'ERROR_ENTREGA'
  return 'SIN_COMPROBANTE'
}

/** Arma el cuerpo del POST. Devuelve null si la clave no es un UUID o el paso no existe. */
export function armarPayloadEmbudo(
  sessionKey: string,
  paso: string,
  motivo: string | null,
  monto: number | null,
): PayloadEmbudo | null {
  if (sessionKey.includes('@') || !UUID.test(sessionKey)) return null
  if (!PASOS_EMBUDO.includes(paso as PasoEmbudo)) return null
  if (motivo != null && !MOTIVOS_EMBUDO.includes(motivo as MotivoEmbudo)) return null
  if (monto != null && (!Number.isInteger(monto) || monto < 0)) return null
  return { sessionKey, paso: paso as PasoEmbudo, motivo, monto }
}
