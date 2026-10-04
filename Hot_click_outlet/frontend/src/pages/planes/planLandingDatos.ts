/**
 * Datos de las landings de plan (/emprende, /para-pymes, /negocio-plus-plan) — rediseño 3-oct-2026.
 * Textos: claves `planes.*` de `textos-planes-final.md` (es/en/pt). Ningún monto: mensualidad y comisión
 * van en [PENDIENTE] hasta que HOT_CLICK los fije. Límites = los que hoy aplica el backend (DataSeeder).
 */
export type PlanLandingId = 'emprendedor' | 'pyme' | 'negocioPlus'

export const QUERY_REGISTRO: Record<PlanLandingId, string> = {
  emprendedor: 'emprendedor',
  pyme: 'pyme',
  negocioPlus: 'negocio-plus',
}

export const RUTA_LANDING: Record<PlanLandingId, string> = {
  emprendedor: '/emprende',
  pyme: '/para-pymes',
  negocioPlus: '/negocio-plus-plan',
}

/** Orden de los puntos de cada tarjeta (claves de `planes.{plan}.punto.*`). El renglón de montos va último. */
export const PUNTOS: Record<PlanLandingId, string[]> = {
  emprendedor: ['productos', 'bodegas', 'pos', 'equipo', 'inventario', 'clientes', 'pagos', 'contacto'],
  pyme: ['contacto', 'productos', 'bodegas', 'pos', 'equipo', 'compras', 'giftCards', 'ia', 'base'],
  negocioPlus: ['contacto', 'productos', 'bodegas', 'pos', 'equipo', 'ia', 'base'],
}

/** Celda de la comparativa: número literal, `si`, `no`, `sinLimite` o `pendiente`. */
export type Celda = string
export const COMPARATIVA: { fila: string; valores: [Celda, Celda, Celda] }[] = [
  { fila: 'productos', valores: ['50', '500', 'sinLimite'] },
  { fila: 'bodegas', valores: ['1', '2', 'sinLimite'] },
  { fila: 'cajas', valores: ['1', '2', 'sinLimite'] },
  { fila: 'usuarios', valores: ['2', '5', 'sinLimite'] },
  { fila: 'inventario', valores: ['si', 'si', 'si'] },
  { fila: 'clientes', valores: ['si', 'si', 'si'] },
  { fila: 'reportes', valores: ['si', 'si', 'si'] },
  { fila: 'telegram', valores: ['si', 'si', 'si'] },
  { fila: 'contacto', valores: ['no', 'si', 'si'] },
  { fila: 'compras', valores: ['no', 'si', 'si'] },
  { fila: 'giftCards', valores: ['no', 'si', 'si'] },
  { fila: 'ia', valores: ['no', '80', 'sinLimite'] },
  { fila: 'mensualidad', valores: ['pendiente', 'pendiente', 'pendiente'] },
  { fila: 'comision', valores: ['pendiente', 'pendiente', 'pendiente'] },
]

export const PLANES_ORDEN: PlanLandingId[] = ['emprendedor', 'pyme', 'negocioPlus']
export const FAQ_IDS = ['1', '2', '3', '4', '5', '6', '7', '8']

/** Fotos locales de /emprende (servidas sin sesión desde 3-oct-2026). */
export const FOTO_HERO: Record<PlanLandingId, { src: string; alt: string }> = {
  emprendedor: { src: '/emprende/local.jpg', alt: 'Interior de un local comercial' },
  pyme: { src: '/emprende/tienda.jpg', alt: 'Tienda con productos en exhibición' },
  negocioPlus: { src: '/emprende/caja.jpg', alt: 'Caja de cobro de un negocio' },
}
