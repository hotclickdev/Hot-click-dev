import { test, expect, type Page } from '@playwright/test'
import { FOTOS, sembrarCookies } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Home sin conexión (Figma `45:2264`): cuando la API no responde (error de red) y no hay datos,
 * Home muestra `PantallaSinConexion`, igual que el fallo 5xx muestra `PantallaFalloServidor`.
 */

async function apiCaida(page: Page) {
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'))
}

async function apiVacia(page: Page) {
  await page.unroute('**/api/**')
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
}

/**
 * Con la API caída el navegador registra el fallo de cada recurso y `useBranding` (código existente,
 * fuera de esta fase) escribe su "Network Error" con console.error: son consecuencia de la caída
 * simulada. Cualquier otro error de consola o de página es un defecto.
 */
const RUIDO_DE_RED = [/Failed to load resource/, /\[useBranding\] branding .*Network Error/s]

function vigilarErrores(page: Page): string[] {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error' || RUIDO_DE_RED.some((r) => r.test(m.text()))) return
    errores.push(`console: ${m.text()}`)
  })
  return errores
}

async function prepararHome(page: Page) {
  await page.addInitScript(() => localStorage.setItem('hc-promo-seen', String(Date.now())))
  await sembrarCookies(page)
}

test.describe('Home sin conexión (45:2264)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('un error de red sin datos muestra la pantalla, con Inicio activo y sin errores', async ({ page }) => {
    const errores = vigilarErrores(page)
    await prepararHome(page)
    await apiCaida(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')

    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)
    expect(errores).toEqual([])
  })

  test('Reintentar vuelve a pedir los datos y regresa al Home cuando la red responde', async ({ page }) => {
    await prepararHome(page)
    await apiCaida(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible({ timeout: 20_000 })

    await apiVacia(page)
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.locator('#home-titulo')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Estás sin conexión' })).toHaveCount(0)
  })

  test('con vistos y favoritos guardados coincide con las posiciones de 45:2264', async ({ page }) => {
    const fotos = Object.values(FOTOS)
    await page.addInitScript(([vistos, favoritos]) => {
      localStorage.setItem('hotclick-recently-viewed', JSON.stringify({ state: { items: vistos }, version: 0 }))
      localStorage.setItem('hotclick-wishlist', JSON.stringify({ state: { items: favoritos }, version: 0 }))
    }, [
      fotos.slice(0, 4).map((imagenUrl, i) => ({ id: i + 1, nombre: `Visto ${i + 1}`, imagenUrl })),
      fotos.slice(4, 6).map((imagenUrl, i) => ({ id: i + 11, nombre: `Favorito ${i + 1}`, imagenUrl, precio: 1000, stock: 3 })),
    ] as const)
    await prepararHome(page)
    await apiCaida(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible({ timeout: 20_000 })

    // La franja negra de 36 px (45:2265) solo existe cuando el navegador avisa que no hay red.
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByRole('status').filter({ hasText: 'Sin conexión' })).toBeVisible()

    const caja = async (selector: string, nth = 0) => {
      const c = await page.locator(selector).nth(nth).boundingBox()
      if (!c) throw new Error(`sin caja: ${selector}`)
      return { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) }
    }
    const casi = (real: number, esperado: number) => expect(Math.abs(real - esperado)).toBeLessThanOrEqual(1)

    const vistos = await caja('main ul:nth-of-type(1) li', 0)
    casi(vistos.y, 279); casi(vistos.x, 20); casi(vistos.w, 80); casi(vistos.h, 76)
    const ultimoVisto = await caja('main ul:nth-of-type(1) li', 3)
    casi(ultimoVisto.x, 290)
    const favorito = await caja('main ul:nth-of-type(2) li', 0)
    casi(favorito.y, 391); casi(favorito.x, 20); casi(favorito.w, 76); casi(favorito.h, 76)
    const segundoFavorito = await caja('main ul:nth-of-type(2) li', 1)
    casi(segundoFavorito.x, 106)
    const reintentar = await caja('button:has-text("Reintentar")')
    casi(reintentar.y, 489); casi(reintentar.x, 20); casi(reintentar.w, 350); casi(reintentar.h, 48)
  })

  test('un 500 sigue mostrando el fallo del servidor, no la pantalla sin conexión', async ({ page }) => {
    await prepararHome(page)
    await page.route('**/api/**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Estás sin conexión' })).toHaveCount(0)
  })

  test('/sin-conexion sigue funcionando y marca Inicio', async ({ page }) => {
    await prepararHome(page)
    await apiVacia(page)
    await page.goto('/sin-conexion', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('Home sin conexión en desktop (sin frame propio)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('usa la misma pantalla, sin variante inventada y sin desbordes', async ({ page }) => {
    await prepararHome(page)
    await apiCaida(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible({ timeout: 20_000 })
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)
  })
})
