import { test, type Page } from '@playwright/test'
import { mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

/**
 * Capturas de SHELL (header, footer, barra inferior, banner) para compararlas contra Figma.
 * Solo corre con SHELL_SHOTS=<carpeta>; sin esa variable se omite.
 */
const SALIDA = process.env.SHELL_SHOTS
test.skip(!SALIDA, 'Solo captura cuando SHELL_SHOTS apunta a una carpeta')
test.use(process.env.CI ? {} : { channel: 'chrome' })

const RUTAS: Array<[string, string]> = [
  ['sin-conexion', '/sin-conexion'],
  ['blog', '/blog'],
  ['productos-cat1', '/productos?cat=1'],
  ['servicios-solicitudes', '/servicios?vista=solicitudes'],
  ['perfil', '/perfil'],
  ['mis-pedidos', '/mis-pedidos'],
  ['wishlist', '/wishlist'],
  ['productos-search', '/productos?search=taza'],
  ['login', '/login'],
  ['carrito', '/carrito'],
  ['descubri', '/descubri'],
  ['buscar-foto', '/buscar/foto'],
  ['home', '/'],
]

async function ir(page: Page, ruta: string, nombre: string, ancho: number, alto: number) {
  await page.setViewportSize({ width: ancho, height: alto })
  await page.goto(ruta, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2300)
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: false })
}

for (const [ancho, alto, sufijo] of [[390, 844, 'm'], [1440, 900, 'd']] as const) {
  test(`capturas ${sufijo}`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.addInitScript(() => localStorage.setItem('hc-promo-seen', String(Date.now())))
    await sembrarCookies(page)
    await sembrarSesion(page, { favoritos: true })
    await mockApisAcc(page)
    for (const [nombre, ruta] of RUTAS) await ir(page, ruta, `${nombre}-${sufijo}`, ancho, alto)
  })
}

test('capturas: sin conexión real y comprador anónimo', async ({ page, context }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.setItem('hc-promo-seen', String(Date.now())))
  await sembrarCookies(page)
  await mockApisAcc(page)
  await ir(page, '/sin-conexion', 'sin-conexion-online-m', 390, 844)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SALIDA}/sin-conexion-offline-m.png` })
  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await ir(page, '/productos?search=sala', 'anon-search-d', 1440, 900)
  await ir(page, '/productos?search=sala', 'anon-search-m', 390, 844)
  await ir(page, '/', 'anon-home-d', 1440, 900)
})
