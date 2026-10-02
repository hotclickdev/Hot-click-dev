import { test, type Page, type Route } from '@playwright/test'
import { FOTOS, SOLICITUDES, mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

/**
 * Capturas de las pantallas SRV para compararlas contra Figma. Solo corre con SRV_SHOTS=<carpeta>;
 * sin esa variable se omite (no es una prueba funcional).
 */
const SALIDA = process.env.SRV_SHOTS
test.skip(!SALIDA, 'Solo captura cuando SRV_SHOTS apunta a una carpeta')
test.use(process.env.CI ? {} : { channel: 'chrome' })

const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

async function ir(page: Page, ruta: string, nombre: string, ancho = 390, alto = 844) {
  await page.setViewportSize({ width: ancho, height: alto })
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true })
}

const GARANTIAS = [
  { productoId: 1, pedidoId: 1048, numeroPedido: 1048, activa: true, diasRestantes: 28, garantiaDias: 40, fechaVencimiento: '2026-10-22', fechaEntrega: '2026-09-12', imagenUrl: FOTOS.auriculares, nombre: 'Auriculares over-ear' },
  { productoId: 2, pedidoId: 1031, numeroPedido: 1031, activa: true, diasRestantes: 12, garantiaDias: 40, fechaVencimiento: '2026-10-09', fechaEntrega: '2026-08-30', imagenUrl: FOTOS.zapatos, nombre: 'Zapatos running rojo' },
]
const ENTRADAS = [
  { id: 1, slug: 'sofa', titulo: 'Cómo elegir un sofá para una sala pequeña', resumen: 'Medidas, colores y materiales para aprovechar cada centímetro.', imagenUrl: FOTOS.sofa, fechaPublicacion: '2026-09-12', contenido: `<p>${'palabra '.repeat(900)}</p>` },
  { id: 2, slug: 'regalos', titulo: '7 regalos hechos a mano para el Día de la Madre', resumen: 'Tazas y bolsos.', imagenUrl: FOTOS.taza, fechaPublicacion: '2026-09-05', contenido: '<p>Hola</p>' },
  { id: 3, slug: 'envios', titulo: 'Cómo funciona el envío de varios paquetes', resumen: 'Cada tienda despacha el suyo.', imagenUrl: FOTOS.bloques, fechaPublicacion: '2026-08-28', contenido: '<p>Hola</p>' },
]

test('capturas SRV con sesión', async ({ page }) => {
  await sembrarSesion(page)
  await mockApisAcc(page, { solicitudes: SOLICITUDES })
  await page.route('**/api/garantias/mis-garantias', (route) => json(route, { success: true, data: GARANTIAS }))
  await ir(page, '/servicios', 'servicios-inicio')
  await ir(page, '/servicios?vista=busqueda', 'servicios-busqueda')
  await ir(page, '/servicios?vista=garantia', 'servicios-garantia')
})

test('capturas SRV públicas', async ({ page }) => {
  await sembrarCookies(page)
  await mockApisAcc(page)
  await page.route('**/api/public/encargos/tok', (route) => json(route, { success: true, data: { id: 214, productoNombre: 'Taza personalizada “Mamá”', nombreCliente: 'María', email: 'm@x.cr', modoPrecio: 'FIJO', estado: 'APROBADO', precioCotizado: 11000, tokenPublico: 'tok', fechaCreacion: '2026-09-22T10:14:00' } }))
  await page.route('**/api/cotizaciones/publica/tok', (route) => json(route, { success: true, data: {
    empresa: { nombreEmpresa: 'Casa Luna 506' },
    cliente: { razonSocial: 'Café Aroma S.A.', cedulaJuridica: '3-101-000000', correo: 'compras@cafearoma.cr' },
    items: [{ nombre: 'Taza personalizada', cantidad: 20, unidadMedida: 'unidades', precioUnitario: 11000, descuentoPorcentaje: 10 }],
    numeroCotizacion: 'COT-2026-0142', fechaEmision: '2026-09-25', fechaVencimiento: '2026-10-10', estadoCotizacion: 'ENVIADA',
    subtotal: 198000, aplicaIva: true, porcentajeIva: 13, montoIva: 25740, total: 223740, moneda: 'CRC' } }))
  await page.route('**/api/blog/publico', (route) => json(route, { success: true, data: ENTRADAS }))
  await page.route('**/api/blog/publico/sofa', (route) => json(route, { success: true, data: { ...ENTRADAS[0], contenido: '<p>Antes de comprar, medí la pared donde va el sofá y el ancho de la puerta.</p><h2>1. Elegí dos plazas</h2><p>En salas de menos de 12 m² un sofá de dos plazas deja espacio para circular.</p><h2>2. Colores claros</h2><p>Los tonos neutros amplían visualmente el ambiente.</p>' } }))
  await ir(page, '/encargo/tok', 'encargo')
  await ir(page, '/cotizacion/tok', 'cotizacion')
  await ir(page, '/envios', 'envios', 390, 1700)
  await ir(page, '/blog', 'blog')
  await ir(page, '/blog/sofa', 'articulo')
})
