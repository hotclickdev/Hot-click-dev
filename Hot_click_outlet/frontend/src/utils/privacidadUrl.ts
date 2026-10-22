/**
 * Quita de cualquier texto los parámetros de URL que llevan tokens de un pedido (`token`, `estadoPagoToken`,
 * `cancelToken`) antes de mandarlo a analítica o a monitoreo (PostHog, Sentry). El token de estado del pago (#207)
 * nunca debe salir del navegador en un evento, un breadcrumb ni un pageview.
 */
const PARAMETRO_SENSIBLE = /([?&])(?:token|estadoPagoToken|cancelToken)=[^&#\s"']*/gi

export function quitarTokensDeUrl(valor: string): string {
  if (!/token=/i.test(valor)) return valor
  return valor
    .replace(PARAMETRO_SENSIBLE, '$1')
    .replace(/\?&+/g, '?')
    .replace(/&{2,}/g, '&')
    .replace(/[?&]+(?=#|$|\s|["'])/g, '')
}

/** Copia del valor con todos los textos limpios (objetos y arreglos, hasta 6 niveles). */
export function limpiarTokensProfundo<T>(valor: T, nivel = 0): T {
  if (typeof valor === 'string') return quitarTokensDeUrl(valor) as T
  if (nivel >= 6 || valor == null || typeof valor !== 'object') return valor
  if (Array.isArray(valor)) return valor.map((v) => limpiarTokensProfundo(v, nivel + 1)) as T
  const salida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) salida[k] = limpiarTokensProfundo(v, nivel + 1)
  return salida as T
}

/** `before_send` de PostHog: limpia `$current_url`, `$referrer`, `$pathname`, `$set`, etc. */
export function limpiarEventoPostHog<T>(evento: T | null): T | null {
  return evento == null ? evento : limpiarTokensProfundo(evento)
}
