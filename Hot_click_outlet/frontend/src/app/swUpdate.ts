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

/** «Ahora no» pospone el aviso: sin esto, la versión en espera se volvía a anunciar en cada recarga o foco. */
const CLAVE_POSPUESTO = 'hc-sw-aviso-pospuesto'
export const POSPONER_AVISO_MS = 6 * 60 * 60 * 1000
/** Mínimo entre chequeos al volver a foco (antes cada cambio de pestaña consultaba). */
export const INTERVALO_MIN_CHEQUEO_MS = 10 * 60 * 1000

type Almacen = Pick<Storage, 'getItem' | 'setItem'>

function almacen(): Almacen | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}

export function posponerAvisoSw(ahora = Date.now(), store: Almacen | null = almacen()): void {
  try { store?.setItem(CLAVE_POSPUESTO, String(ahora)) } catch { /* sin storage: solo esta vista */ }
}

/** ¿Se muestra el aviso? No si el usuario lo pospuso hace menos de {@link POSPONER_AVISO_MS}. */
export function debeMostrarAvisoSw(ahora = Date.now(), store: Almacen | null = almacen()): boolean {
  let valor: string | null
  try { valor = store?.getItem(CLAVE_POSPUESTO) ?? null } catch { valor = null }
  const pospuesto = Number(valor)
  return !(Number.isFinite(pospuesto) && pospuesto > 0 && ahora - pospuesto < POSPONER_AVISO_MS)
}

/** Limita los chequeos de versión al volver a foco. Devuelve una función que dice si toca chequear ahora. */
export function crearLimitadorChequeo(intervalo = INTERVALO_MIN_CHEQUEO_MS): (ahora?: number) => boolean {
  let ultimo = 0
  return (ahora = Date.now()) => {
    if (ahora - ultimo < intervalo) return false
    ultimo = ahora
    return true
  }
}
