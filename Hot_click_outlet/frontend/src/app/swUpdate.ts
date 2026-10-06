/**
 * Callback para aplicar update del service worker tras confirmación del usuario.
 * Evita SKIP_WAITING + reload silencioso mid-wizard.
 */
let aplicarActualizacion: ((recargar?: boolean) => Promise<void>) | null = null

export function registrarAplicarSwUpdate(fn: (recargar?: boolean) => Promise<void>) {
  aplicarActualizacion = fn
}

export function aplicarSwUpdate(recargar = true): Promise<void> {
  return aplicarActualizacion?.(recargar) ?? Promise.resolve()
}

/**
 * Paneles y flujos de rol: siempre en modo *prompt* (banner "Actualizar"). Nunca se recargan solos, para no cortar
 * una venta en la caja POS ni un formulario del panel. Aprobado por el usuario el 2-oct-2026.
 */
const PREFIJOS_SOLO_PROMPT = [
  '/admin', '/plataforma', '/emprendedor', '/pyme', '/negocio-plus', '/pos', '/caja', '/checkout/qr',
  '/seleccionar-negocio', '/mode-select', '/registrar-negocio', '/registro-empresa', '/visitante', '/prototipo',
] as const

/** Rutas de visitante con formulario o pago en curso: tampoco se recargan solas (el visitante perdería lo escrito). */
const PREFIJOS_VISITANTE_EN_CURSO = [
  '/checkout', '/pago', '/carrito', '/contacto', '/encargo', '/cotizacion', '/login', '/registro', '/recuperar',
  '/servicios', '/buscar/foto',
] as const

function empiezaCon(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`)
}

/**
 * ¿Se aplica sola la versión nueva? Solo para un **visitante sin sesión** en una ruta de visitante que no tenga un
 * formulario o pago a medias. En la tienda pública, el carrito y el checkout cuentan como "en curso".
 */
export function debeAutoActualizar(ruta: string, haySesion: boolean): boolean {
  if (haySesion) return false
  const limpia = (ruta.split(/[?#]/)[0] || '/').replace(/\/+$/, '') || '/'
  if (PREFIJOS_SOLO_PROMPT.some((p) => empiezaCon(limpia, p))) return false
  if (PREFIJOS_VISITANTE_EN_CURSO.some((p) => empiezaCon(limpia, p))) return false
  if (/^\/tienda\/[^/]+\/(carrito|checkout|pago)(\/|$)/.test(limpia)) return false
  return true
}
