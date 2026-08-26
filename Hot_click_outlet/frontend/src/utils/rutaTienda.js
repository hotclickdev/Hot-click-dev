/** Rutas de tienda pública por slug (`/tienda/:slug/...`). */

export function esRutaTienda(pathname) {
  return pathname === '/tienda' || pathname.startsWith('/tienda/')
}

/** En Sistema: marca pública (nombre, logo, WhatsApp) e interruptor de visibilidad. */
export const RUTA_SISTEMA_MARCA = '/admin/configuracion?seccion=marca'

/** Alias: publicar la tienda se hace en la misma pantalla de Marca. */
export const RUTA_SISTEMA_VISIBILIDAD = RUTA_SISTEMA_MARCA

/** Misma regla que SlugTenantInterceptor: ACTIVO + visibilidad pública. */
export function tiendaEsPublica(empresa) {
  return empresa?.estadoEmpresa === 'ACTIVO' && empresa?.visibilidadPublica === true
}

/** Aprobado y oculto: el dueño puede publicar sin esperar a HotClick. */
export function puedePublicarTienda(empresa) {
  return empresa?.estadoEmpresa === 'ACTIVO' && empresa?.visibilidadPublica === false
}

export function rutaProductoEnTienda(slug, productoId) {
  if (!slug) return null
  if (productoId) return `/tienda/${slug}/producto/${productoId}`
  return `/tienda/${slug}`
}

/** URL absoluta para compartir (origin actual + ruta de tienda). */
export function urlAbsolutaDesdeRuta(ruta) {
  if (!ruta) return null
  const origin = globalThis.location?.origin ?? ''
  return `${origin}${ruta}`
}
