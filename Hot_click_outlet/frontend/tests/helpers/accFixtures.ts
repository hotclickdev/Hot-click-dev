import type { Page, Route } from '@playwright/test'

/**
 * Datos de prueba de ACC (cuenta, pedidos, favoritos, solicitudes) con los mismos valores que dibuja Figma
 * (María Rojas, pedidos #1042 / #1038 / #1021). La API es simulada: ninguna prueba toca el backend real.
 */

const foto = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${color}"/></svg>`)}`

export const FOTOS = {
  sofa: foto('#24544a'),
  auriculares: foto('#f5c518'),
  silla: foto('#e6e8e3'),
  serum: foto('#e9eae6'),
  zapatos: foto('#c4262e'),
  taza: foto('#eceeea'),
  bloques: foto('#6a7fa8'),
  bolso: foto('#2b2b2b'),
  perro: foto('#9fb7c9'),
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
/** JWT de prueba con exp lejano: el guard de rutas solo mira la vigencia, la firma no se valida en el cliente. */
export const TOKEN_PRUEBA = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: '7', exp: 4102444800 })}.firma`

export const USUARIO = {
  id: 7,
  nombre: 'María Rojas Solano',
  correo: 'maria.rojas@correo.com',
  telefono: '8888-1234',
}

const IDS_PRODUCTO: Record<string, number> = { 'Sérum facial de día': 501, 'Zapatos running rojo': 502 }
type ItemPrueba = { nombre: string; precio: number; foto: string; tienda: string; cantidad?: number }
const item = ({ nombre, precio, foto, tienda, cantidad = 1 }: ItemPrueba) => ({
  cantidad, nombreProducto: nombre, precioUnitarioMomento: precio, subtotalItem: precio * cantidad,
  producto: { id: IDS_PRODUCTO[nombre] ?? Math.abs(nombre.length * 31), nombreProducto: nombre, imagenPrincipalUrl: foto, empresaNombre: tienda },
})
const bodega = (provincia: string) => ({ id: 1, nombreBodega: 'Bodega', provincia })

/** Pedidos con la forma que devuelve GET /pedidos/usuario/:id (items con producto, bodega con provincia). */
export const PEDIDOS = [
  { id: 1042, numeroPedido: 'ORD-10482', fechaPedido: '2026-09-24T10:00:00', estadoPedido: 'ENVIADO', totalPedido: 33400, grupoPago: 'GRP-1042', numeroGuia: 'CR123456789CR', fechaEnvio: '2026-09-25T09:00:00', urlTracking: 'https://correos.go.cr/rastreo/CR123456789CR', metodoEnvio: 'ENVIO_NORMAL_GAM', costoEnvio: 4000, metodoPago: 'SINPE Móvil', fechaEntregaEstimada: '2026-09-29', bodega: bodega('San José'),
    items: [item({ nombre: 'Sofá de sala dos plazas', precio: 17500, foto: FOTOS.sofa, tienda: 'Casa Luna 506' }), item({ nombre: 'Auriculares over-ear', precio: 11900, foto: FOTOS.auriculares, tienda: 'Casa Luna 506' })] },
  { id: 1043, numeroPedido: 'ORD-10482', fechaPedido: '2026-09-24T10:00:00', estadoPedido: 'EN_PREPARACION', totalPedido: 36000, grupoPago: 'GRP-1042', metodoEnvio: 'ENVIO_NORMAL_GAM', costoEnvio: 4000, metodoPago: 'SINPE Móvil', bodega: bodega('Cartago'),
    items: [item({ nombre: 'Sillón de sala verde', precio: 32000, foto: FOTOS.silla, tienda: 'Bruma Café' })] },
  { id: 1044, numeroPedido: 'ORD-10482', fechaPedido: '2026-09-24T10:00:00', estadoPedido: 'ENTREGADO', totalPedido: 26500, grupoPago: 'GRP-1042', numeroGuia: 'RR987654321CR', fechaEntregaReal: '2026-09-26', metodoEnvio: 'ENVIO_NORMAL_FUERA_GAM', costoEnvio: 4000, metodoPago: 'SINPE Móvil', bodega: bodega('Guanacaste'),
    items: [item({ nombre: 'Bloques de madera para niños', precio: 22500, foto: FOTOS.bloques, tienda: 'Taller Ceiba' })] },
  { id: 1038, numeroPedido: '1038', fechaPedido: '2026-09-22T09:00:00', estadoPedido: 'EN_PREPARACION', totalPedido: 11900, metodoEnvio: 'ENVIO_NORMAL_GAM', costoEnvio: 0, bodega: bodega('San José'),
    items: [item({ nombre: 'Auriculares over-ear', precio: 11900, foto: FOTOS.auriculares, tienda: 'Casa Luna 506' })] },
  { id: 1021, numeroPedido: '1021', fechaPedido: '2026-09-12T15:00:00', estadoPedido: 'ENTREGADO', totalPedido: 28900, numeroGuia: 'CR000111222CR', fechaEntregaReal: '2026-09-20', metodoEnvio: 'ENVIO_NORMAL_GAM', costoEnvio: 0, bodega: bodega('Heredia'),
    items: [item({ nombre: 'Sérum facial de día', precio: 28900, foto: FOTOS.serum, tienda: 'Taller Ceiba' })] },
]

export const SOLICITUDES = [
  { id: 31, estado: 'ENCONTRADO', fechaCreacion: '2026-09-23T15:47:00', descripcion: 'Lámpara de pie estilo nórdico', presupuesto: '30000', notasAdmin: 'Lámpara de pie nórdica, 1,6 m · ₡24.500', fotosUrls: FOTOS.silla },
  { id: 30, estado: 'EN_BUSQUEDA', fechaCreacion: '2026-09-25T10:00:00', descripcion: 'Bolso de cuero café', presupuesto: '', notasAdmin: null, fotosUrls: FOTOS.bolso },
  { id: 29, estado: 'NO_ENCONTRADO', fechaCreacion: '2026-09-10T10:00:00', descripcion: 'Juego de tazas de cerámica', presupuesto: '', notasAdmin: null, fotosUrls: FOTOS.taza },
]

/** Forma real de GET /testimonios/productos-para-resenar (sin tienda ni fecha: salen del pedido por `pedidoId`). */
export const PARA_RESENAR = [
  { productoId: 501, nombre: 'Sérum facial de día', imagenUrl: FOTOS.serum, pedidoId: 1021, resenasEnviadas: 0, puedeResenar: true },
  { productoId: 502, nombre: 'Zapatos running rojo', imagenUrl: FOTOS.zapatos, pedidoId: 1021, resenasEnviadas: 0, puedeResenar: true },
]

/** Forma real de GET /testimonios/mis-testimonios. */
export const MIS_TESTIMONIOS = [
  { id: 1, tipo: 'RESENA', productoId: 9, productoNombre: 'Taza personalizada con nombre y color', comentario: 'Quedó igualita al diseño y llegó bien empacada. Se la regalé a mi mamá y le encantó.', calificacion: 5, estado: 'APROBADO', fechaCreacion: '2026-09-27T10:00:00' },
]

export const PRODUCTOS_FAVORITOS = [
  { id: 1, nombre: 'Sillón de sala verde', precio: 32000, imagenUrl: FOTOS.silla, stock: 5, empresaNombre: 'Bruma Café' },
  { id: 2, nombre: 'Auriculares over-ear', precio: 11900, imagenUrl: FOTOS.auriculares, stock: 12, empresaNombre: 'Casa Luna 506' },
  { id: 3, nombre: 'Bolso personalizado en color y grabado', precio: 7900, imagenUrl: FOTOS.bolso, stock: 9, empresaNombre: 'Casa Luna 506' },
  { id: 4, nombre: 'Cama y correa para perro', precio: 21000, imagenUrl: FOTOS.perro, stock: 7, empresaNombre: 'Taller Ceiba' },
]

export type OpcionesSesion = { sinSesion?: boolean }

/** Siembra sesión de comprador, consentimiento de cookies y (opcional) favoritos. Sin estado a medio escribir. */
export async function sembrarSesion(page: Page, opciones: { favoritos?: boolean; conCorreoCapturado?: boolean } = {}) {
  await page.addInitScript(([usuario, favoritos, token]) => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hotclick-auth', JSON.stringify({
      state: {
        token, userId: usuario.id, userEmail: usuario.correo, userRole: 'USUARIO_FINAL', userName: usuario.nombre,
        empresaId: null, empresaSlug: null, empresaNombre: null, permissions: [], roles: ['USUARIO_FINAL'], correoVerificado: true, impersonando: false, adminOriginal: null,
      },
      version: 0,
    }))
    if (favoritos) localStorage.setItem('hotclick-wishlist', JSON.stringify({ state: { items: favoritos }, version: 0 }))
  }, [USUARIO, opciones.favoritos ? PRODUCTOS_FAVORITOS : null, TOKEN_PRUEBA] as const)
}

export async function sembrarCookies(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  })
}

type Datos = {
  pedidos?: unknown[]
  solicitudes?: unknown[]
  paraResenar?: unknown[]
  twoFA?: boolean
  misTestimonios?: unknown[]
  garantias?: unknown[]
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** API simulada: respuestas por defecto vacías y rutas de ACC con los datos de Figma. */
export async function mockApisAcc(page: Page, datos: Datos = {}) {
  const { pedidos = PEDIDOS, solicitudes = SOLICITUDES, paraResenar = PARA_RESENAR, twoFA = true, misTestimonios = MIS_TESTIMONIOS, garantias = [] } = datos
  await page.route('**/api/**', (route) => json(route, { success: true, data: [] }))
  await page.route('**/api/pedidos/usuario/**', (route) => json(route, { success: true, data: { content: pedidos, totalPages: 1 } }))
  await page.route('**/api/auth/2fa/status', (route) => json(route, { success: true, data: { enabled: twoFA } }))
  await page.route('**/api/servicios/mis-solicitudes', (route) => json(route, { success: true, data: solicitudes }))
  await page.route('**/api/testimonios/productos-para-resenar', (route) => json(route, { success: true, data: paraResenar }))
  await page.route('**/api/testimonios/mis-testimonios', (route) => json(route, { success: true, data: misTestimonios }))
  await page.route('**/api/garantias/**', (route) => json(route, { success: true, data: garantias }))
  await page.route(/\/api\/usuarios\/\d+$/, (route) => json(route, { success: true, data: { id: USUARIO.id, nombre: USUARIO.nombre, correo: USUARIO.correo, telefono: USUARIO.telefono } }))
}
