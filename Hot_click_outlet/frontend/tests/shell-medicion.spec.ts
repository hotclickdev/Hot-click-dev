import { writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { mockApisAcc, sembrarSesion } from './helpers/accFixtures'

/**
 * Medición del chrome de SHELL contra Figma (header, barra inferior, banner y pie).
 * Solo corre con SHELL_MEDIR=<archivo.json>; sin esa variable se omite. Escribe una tabla en JSON y otra en consola.
 * Valores esperados: metadata de Figma (archivo TmxYFj2nauu10WZnZ0t6yt) con el origen del frame restado.
 * Tolerancia: ±1 px.
 */
const SALIDA = process.env.SHELL_MEDIR
test.skip(!SALIDA, 'Solo mide cuando SHELL_MEDIR apunta a un archivo .json')
test.use(process.env.CI ? {} : { channel: 'chrome' })

const TOLERANCIA = 1

type Esperado = { x?: number; y?: number; w?: number; h?: number }
type Fila = {
  caso: string
  elemento: string
  frame: string
  esperado: Esperado
  app: { x: number; y: number; w: number; h: number } | null
  ok: boolean
  diferencia: string
}
const filas: Fila[] = []

const CATEGORIAS = ['Hogar', 'Tecnología', 'Deportes', 'Accesorios', 'Mascotas', 'Comidas y bebidas'].map((nombre, i) => ({
  id: i + 1, nombre, cantidad: 3, fotoUrl: null,
}))

const redondear = (n: number) => Math.round(n * 10) / 10

async function medir(page: Page, caso: string, elemento: string, frame: string, selector: string, esperado: Esperado, nth = 0) {
  const caja = await page.locator(selector).nth(nth).boundingBox({ timeout: 4000 }).catch(() => null)
  const app = caja ? { x: redondear(caja.x), y: redondear(caja.y), w: redondear(caja.width), h: redondear(caja.height) } : null
  const difs: string[] = []
  if (!app) difs.push('no encontrado')
  else {
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      const e = esperado[k]
      if (e !== undefined && Math.abs(app[k] - e) > TOLERANCIA) difs.push(`${k}: app ${app[k]} / figma ${e}`)
    }
  }
  filas.push({ caso, elemento, frame, esperado, app, ok: difs.length === 0, diferencia: difs.join('; ') })
}

async function preparar(page: Page, opciones: { sesion?: boolean; carrito?: number } = {}) {
  await page.addInitScript(() => localStorage.setItem('hc-promo-seen', String(Date.now())))
  if (opciones.sesion) await sembrarSesion(page)
  else {
    await page.addInitScript(() => {
      sessionStorage.setItem('hc-return-banner-dismissed', '1')
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    })
  }
  if (opciones.carrito) {
    const cantidad = opciones.carrito
    await page.addInitScript((n) => {
      const items = Array.from({ length: n }, (_, i) => ({ id: i + 1, nombre: `Producto ${i + 1}`, precio: 5000, cantidad: 1, stock: 9, empresaNombre: 'Casa Luna 506' }))
      localStorage.setItem('hotclick-cart', JSON.stringify({ state: { items, cartUpdatedAt: Date.now() }, version: 0 }))
    }, cantidad)
  }
  await mockApisAcc(page)
  await page.route('**/api/categorias/publicas/con-productos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: CATEGORIAS }) }),
  )
}

async function ir(page: Page, ruta: string) {
  await page.goto(ruta, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2300)
}

const BARRA_INFERIOR = 'nav[class~="fixed"][class~="bottom-0"]'

/** Barra inferior (12:582): y 777, alto 67; cada ítem en su x, y+9 y alto 38. */
async function barraInferior(page: Page, caso: string) {
  await medir(page, caso, 'barra inferior', '12:582', BARRA_INFERIOR, { x: 0, y: 777, w: 390, h: 67 })
  const items: Array<[string, number, number]> = [['Inicio', 22, 28], ['Buscar', 88.25, 36], ['Categorías', 162.5, 56], ['Pedido', 256.75, 36], ['Cuenta', 331, 37]]
  for (const [i, [nombre, x, w]] of items.entries()) {
    await medir(page, caso, `barra inferior · ${nombre}`, '12:582', `${BARRA_INFERIOR} > *`, { x, y: 786, w, h: 38 }, i)
  }
}

/**
 * Banner de vendedor + pie en móvil (12:483 alto 67, 12:489 alto 71 = 138). Desde B1 el pie lleva
 * "Preferencias de cookies" e "Idioma y accesibilidad" en una segunda línea de 18 px que Figma no
 * dibuja: 71 + 18 = 89 y 67 + 89 = 156. Es la única diferencia esperada.
 */
async function pieMovil(page: Page, caso: string) {
  await medir(page, caso, 'banner + pie (total, +18 de B1)', '12:483+12:489', 'footer', { w: 390, h: 156 })
  await medir(page, caso, 'banner vendedor', '12:483', 'footer > a', { w: 390, h: 67 })
  await medir(page, caso, 'pie legal (+18 de B1)', '12:489', 'footer > div', { w: 390, h: 89 })
}

/** Banner + pie en desktop (9:550 alto 84, 9:559 alto 59 = 143). */
async function pieEscritorio(page: Page, caso: string) {
  await medir(page, caso, 'banner + pie (total)', '9:550+9:559', 'footer', { w: 1440, h: 143 })
  await medir(page, caso, 'banner vendedor', '9:550', 'footer > a', { w: 1440, h: 84 })
  await medir(page, caso, 'pie legal', '9:559', 'footer > div', { w: 1440, h: 59 })
}

test.describe('Móvil 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.setTimeout(120_000)

  test('Home (header global 12:551, barra, pie)', async ({ page }) => {
    await preparar(page, { carrito: 2 })
    await ir(page, '/')
    const c = 'Home 390'
    await medir(page, c, 'header global', '12:551', 'header', { x: 0, y: 0, w: 390, h: 160 })
    await medir(page, c, 'marca', '12:553', 'header a[href="/"]:visible', { x: 16, y: 12, w: 127, h: 30 })
    await medir(page, c, 'favoritos (icono)', '12:557', 'header a[href="/wishlist"]:visible > *', { x: 308, y: 16, w: 22, h: 22 })
    await medir(page, c, 'carrito (enlace)', '12:559', 'header a[href="/carrito"]:visible', { x: 348, y: 15, w: 26, h: 24 })
    await medir(page, c, 'buscador híbrido', '12:566', 'header [class~="bg-hc-n-100"][class~="rounded-[12px]"]:visible', { x: 16, y: 54, w: 358, h: 48 })
    await medir(page, c, 'chip 1 (Hogar)', '12:576', 'header nav:visible a', { x: 16, y: 114, w: 68, h: 33 }, 0)
    await medir(page, c, 'chip 2 (Tecnología)', '12:577', 'header nav:visible a', { x: 92, y: 114, w: 96, h: 33 }, 1)
    await barraInferior(page, c)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    await pieMovil(page, c)
  })

  test('/productos (header global, barra)', async ({ page }) => {
    await preparar(page)
    await ir(page, '/productos')
    await medir(page, '/productos 390', 'header', '12:551 / 43:1530 / 26:722', 'header', { x: 0, y: 0, w: 390 })
    await barraInferior(page, '/productos 390')
  })

  test('/perfil (barra interna, barra inferior)', async ({ page }) => {
    await preparar(page, { sesion: true })
    await ir(page, '/perfil')
    await medir(page, '/perfil 390', 'header', '28:1196', 'header', { x: 0, y: 0, w: 390 })
    await barraInferior(page, '/perfil 390')
  })

  test('/carrito (barra interna 28:1144)', async ({ page }) => {
    await preparar(page, { carrito: 2 })
    await ir(page, '/carrito')
    const c = '/carrito 390'
    await medir(page, c, 'barra interna', '28:1144 / 28:989', 'header', { x: 0, y: 0, w: 390, h: 51 })
    await medir(page, c, 'flecha atrás', '28:1146', 'header button', { x: 16, y: 14, w: 22, h: 22 })
    await medir(page, c, 'título', '28:1148', 'header p', { x: 50, y: 14.5, h: 21 })
  })

  test('404 (barra de marca 45:2199)', async ({ page }) => {
    await preparar(page)
    await ir(page, '/ruta-que-no-existe')
    const c = '404 390'
    await medir(page, c, 'barra de marca', '45:2199', 'header', { x: 0, y: 0, w: 390, h: 53 })
    await medir(page, c, 'isotipo', '45:2201', 'header img', { x: 16, y: 12, w: 28, h: 28 })
    await medir(page, c, 'wordmark', '45:2202', 'header a[href="/"] span.font-display', { x: 52, y: 14.5, w: 84, h: 23 })
    await barraInferior(page, c)
  })

  test('/pago/exito (barra de marca centrada 29:1933)', async ({ page }) => {
    await preparar(page, { sesion: true })
    await page.route('**/api/payments/status/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ estadoPago: 'CAPTURADO', numeroPedido: 'ORD-10482' }) }),
    )
    await ir(page, '/pago/exito?order=ORD-10482')
    const c = '/pago/exito 390'
    await medir(page, c, 'barra de marca centrada', '29:1933', 'header', { x: 0, y: 0, w: 390, h: 55 })
    await medir(page, c, 'isotipo', '29:1935', 'header img', { x: 138, y: 14, w: 26, h: 26 })
    await medir(page, c, 'wordmark', '29:1936', 'header a[href="/"] span.font-display', { x: 172, y: 16.5, w: 80, h: 21 })
  })
})

test.describe('Desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test.setTimeout(120_000)

  test('Home (header completo 12:809, pie)', async ({ page }) => {
    await preparar(page, { carrito: 2 })
    await ir(page, '/')
    const c = 'Home 1440'
    await medir(page, c, 'header completo', '12:809', 'header', { x: 0, y: 0, w: 1440, h: 111 })
    await medir(page, c, 'marca', '12:811', 'header a[href="/"]:visible', { x: 120, y: 22, w: 145, h: 34 })
    await medir(page, c, 'buscador híbrido', '12:814', 'header form[role="search"]:visible', { x: 297, y: 16, w: 795, h: 46 })
    await medir(page, c, 'fila de categorías', '12:841', 'header nav:visible', { x: 120, y: 76, w: 1200, h: 34 })
    await medir(page, c, 'favoritos (icono)', '12:832', 'header a[href="/wishlist"]:visible > *', { x: 1227, y: 28, w: 22, h: 22 })
    await medir(page, c, 'carrito (con badge)', '12:834', 'header a[href="/carrito"]:visible', { x: 1271, y: 28, w: 49, h: 22 })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(400)
    await pieEscritorio(page, c)
  })

  test('/productos (header completo 12:809)', async ({ page }) => {
    await preparar(page, { carrito: 2 })
    await ir(page, '/productos')
    await medir(page, '/productos 1440', 'header completo', '30:1824 / 12:809', 'header', { x: 0, y: 0, w: 1440, h: 111 })
  })

  test('/perfil (header compacto 30:1480)', async ({ page }) => {
    await preparar(page, { sesion: true })
    await ir(page, '/perfil')
    const c = '/perfil 1440'
    await medir(page, c, 'header compacto', '30:1480', 'header', { x: 0, y: 0, w: 1440, h: 79 })
    await medir(page, c, 'buscador compacto', '30:1485', 'header form[role="search"]:visible', { x: 297, y: 16, w: 875, h: 46 })
    await medir(page, c, 'avatar', '30:1491', 'header span[class~="rounded-full"][class~="bg-hc-blue-600"]:visible', { x: 1204, y: 23, w: 32, h: 32 })
  })

  test('/carrito (header compacto 30:1480)', async ({ page }) => {
    await preparar(page, { carrito: 2 })
    await ir(page, '/carrito')
    const c = '/carrito 1440'
    await medir(page, c, 'header del carrito (alto)', '30:2269', 'header', { x: 0, y: 0, w: 1440, h: 83 })
    await medir(page, c, 'marca', '30:2271', 'header a[href="/"]:visible', { x: 120, y: 24, w: 145, h: 34 })
    await medir(page, c, 'buscador (sin badge en Figma)', '30:2274', 'header form[role="search"]:visible', { x: 297, y: 18, h: 46 })
    await medir(page, c, 'título "Tu pedido"', '30:2290', 'main >> text=/^Tu pedido/ >> visible=true', { x: 120, y: 119 })
    await medir(page, c, 'columnas: resumen lateral', '30:2351', 'aside:visible', { x: 940, y: 177, w: 380 })
  })

  test('/checkout (header mínimo 30:2386)', async ({ page }) => {
    await preparar(page, { sesion: true, carrito: 2 })
    await ir(page, '/checkout')
    const c = '/checkout 1440'
    await medir(page, c, 'header mínimo', '30:2386', 'header', { x: 0, y: 0, w: 1440, h: 71 })
    await medir(page, c, 'marca', '30:2388', 'header a[href="/"]:visible', { x: 120, y: 18, w: 145, h: 34 })
  })

  test('404 (header completo; sin frame desktop propio)', async ({ page }) => {
    await preparar(page)
    await ir(page, '/ruta-que-no-existe')
    await medir(page, '404 1440', 'header', 'sin frame desktop', 'header', { x: 0, y: 0, w: 1440 })
  })
})

test.afterAll(() => {
  if (!SALIDA) return
  writeFileSync(SALIDA, JSON.stringify(filas, null, 2))
  const fallan = filas.filter((f) => !f.ok)
  console.log(`\nMEDICIÓN SHELL: ${filas.length} medidas, ${filas.length - fallan.length} dentro de ±${TOLERANCIA} px, ${fallan.length} con diferencia`)
  for (const f of fallan) console.log(`  [${f.caso}] ${f.elemento} (${f.frame}): ${f.diferencia}`)
})
