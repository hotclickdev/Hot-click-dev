/**
 * Pago en el checkout. Tilopay está en retiro: ningún botón va a esa pasarela.
 * - Tarjeta: checkout hospedado de ONVO solo si el backend publica `tarjetaOnvo: true`
 *   (PAYMENTS_ONVO_ENABLED y ONVO configurado). Sin config o con error: «Próximamente».
 * - SINPE Móvil: por ONVO cuando `tarjetaOnvo: true`; si no, flujo manual con comprobante (/sinpe/checkout), solo si el backend publica
 *   `sinpeManual: true` en /public/checkout-config. Sin config o con error: «Próximamente».
 * - Efectivo / contra entrega: fuera del checkout web (decisión 24-oct-2026: el efectivo queda solo en el POS).
 */
export const PAGO_SINPE = 'PASARELA_SINPE'
export const PAGO_TARJETA = 'PASARELA_TARJETA'
export const PAGO_EFECTIVO = 'EFECTIVO'

/** true si el método se muestra deshabilitado con «Próximamente». */
export function metodoProximamente(metodoUi: string, sinpeManualHabilitado: boolean, tarjetaOnvoHabilitada = false): boolean {
  if (metodoUi === PAGO_SINPE) return !(tarjetaOnvoHabilitada || sinpeManualHabilitado)
  if (metodoUi === PAGO_TARJETA) return !tarjetaOnvoHabilitada
  return true
}

/** Valor que viaja como `provider` al API; null = método no disponible (no se inicia ningún pago). */
export function proveedorDe(metodoUi: string, sinpeManualHabilitado = false, tarjetaOnvoHabilitada = false): string | null {
  // Pasarela única: ONVO (su checkout hospedado ofrece tarjeta y SINPE Móvil). Nunca Tilopay.
  if ((metodoUi === PAGO_TARJETA || metodoUi === PAGO_SINPE) && tarjetaOnvoHabilitada) return 'ONVO'
  if (metodoUi === PAGO_SINPE && sinpeManualHabilitado) return 'SINPE'
  return null
}

/**
 * Si el método elegido quedó deshabilitado, devuelve el primero disponible.
 * `disponibles` son los ids que se pueden elegir hoy (sin los bloqueados por envío rápido).
 * Si no hay ninguno, devuelve el actual: «Pagar» avisa en vez de quedar mudo.
 */
export function metodoSeleccionable(actual: string, disponibles: string[], sinpeManualHabilitado: boolean, tarjetaOnvoHabilitada = false): string {
  const usables = disponibles.filter((m) => !metodoProximamente(m, sinpeManualHabilitado, tarjetaOnvoHabilitada))
  if (usables.includes(actual)) return actual
  return usables[0] ?? actual
}

/** Lee el booleano de la config pública; cualquier otro valor (o error) = deshabilitado. */
export function sinpeManualDesdeConfig(data: unknown): boolean {
  return (data as { sinpeManual?: unknown } | null | undefined)?.sinpeManual === true && sinpeDestinoDesdeConfig(data) !== ''
}

/** Destino SINPE Móvil de ONVO publicado por el backend; cualquier otro valor = '' (SINPE manual «Próximamente»). */
export function sinpeDestinoDesdeConfig(data: unknown): string {
  const d = (data as { sinpeDestino?: unknown } | null | undefined)?.sinpeDestino
  return typeof d === 'string' ? d.trim() : ''
}

/** Tarjeta por ONVO solo con `tarjetaOnvo === true` en la config pública; cualquier otro valor = «Próximamente». */
export function tarjetaOnvoDesdeConfig(data: unknown): boolean {
  return (data as { tarjetaOnvo?: unknown } | null | undefined)?.tarjetaOnvo === true
}

/** Compat: método con el que abre el checkout. */
export function metodoPagoPrincipal(): string {
  return PAGO_SINPE
}

type ItemConBodega = { bodega?: { aceptaEfectivo?: boolean } | null; bodegaAceptaEfectivo?: boolean }

/** Efectivo solo si todos los negocios del carrito lo aceptan. */
export function efectivoDisponible(items: ItemConBodega[]): boolean {
  return items.length > 0 && items.every((i) => (i.bodegaAceptaEfectivo ?? i.bodega?.aceptaEfectivo) === true)
}

/** Contra entrega: todos los paquetes por Envío Normal y la config del servidor la habilita. */
export function contraEntregaDisponible(metodosEnvio: string[], habilitada: boolean): boolean {
  return habilitada && metodosEnvio.length > 0 && metodosEnvio.every((m) => m.startsWith('ENVIO_NORMAL'))
}
