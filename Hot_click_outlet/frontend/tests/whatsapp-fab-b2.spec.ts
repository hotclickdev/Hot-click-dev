import { test, expect, type Page, type Locator } from '@playwright/test'
import { mockApisAcc, sembrarSesion } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * B2: el WhatsApp flotante no tapa el pie legal ni usa el offset de la barra
 * en pantallas que no la tienen. Home y desktop conservan la posición de Figma.
 */

type Caja = { x: number; y: number; width: number; height: number }

const FAB = 'Consultar un producto por WhatsApp'

function fab(page: Page) {
  return page.getByRole('link', { name: FAB, exact: true })
}

function barra(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación principal' })
}

function seCruzan(a: Caja, b: Caja) {
  const enX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const enY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return enX > 1 && enY > 1
}

async function cajaDe(locator: Locator): Promise<Caja> {
  const caja = await locator.boundingBox()
  expect(caja).not.toBeNull()
  return caja as Caja
}

async function preparar(page: Page, ruta: string, sesion = false) {
  if (sesion) await sembrarSesion(page)
  else {
    await page.addInitScript(() => {
      sessionStorage.setItem('hc-return-banner-dismissed', '1')
      localStorage.setItem('hc-promo-seen', String(Date.now()))
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    })
  }
  await mockApisAcc(page)
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
}

async function alFinal(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
}

async function sinDesborde(page: Page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(desborde).toBeLessThanOrEqual(0)
}

async function sinIsotipo(page: Page) {
  await expect(page.locator('.hc-isotipo-placa')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /opciones de accesibilidad/i })).toHaveCount(0)
}

async function margenInferior(page: Page, locator: Locator) {
  const caja = await cajaDe(locator)
  const alto = page.viewportSize()?.height ?? 0
  return alto - (caja.y + caja.height)
}

test.describe('WhatsApp flotante — móvil 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Home conserva (318, 705) y al final no tapa el pie legal', async ({ page }) => {
    await preparar(page, '/')
    await expect(barra(page)).toBeVisible()
    await expect(page.locator('footer').getByRole('link', { name: 'Términos', exact: true })).toBeVisible()
    await sinIsotipo(page)
    await sinDesborde(page)

    const inicio = await cajaDe(fab(page))
    expect(Math.abs(inicio.x - 318)).toBeLessThanOrEqual(1)
    expect(Math.abs(inicio.y - 705)).toBeLessThanOrEqual(1)
    expect(Math.round(inicio.width)).toBe(56)
    const cajaBarra = await cajaDe(barra(page))
    expect(inicio.y + inicio.height).toBeLessThanOrEqual(cajaBarra.y + 1)
    await expect(page.locator('[data-espacio="155"]')).toHaveCount(1)

    await alFinal(page)
    const flotante = await cajaDe(fab(page))
    for (const nombre of ['Términos', 'Preferencias de cookies', 'Idioma y accesibilidad']) {
      const rol = nombre === 'Términos' ? 'link' : 'button'
      const legal = page.locator('footer').getByRole(rol, { name: nombre, exact: true })
      await expect(legal).toBeVisible()
      expect(seCruzan(flotante, await cajaDe(legal))).toBe(false)
    }
    await sinDesborde(page)
  })

  test('catálogo y categorías quedan 16 px sobre la barra', async ({ page }) => {
    for (const ruta of ['/productos', '/categorias']) {
      await preparar(page, ruta)
      await expect(barra(page)).toBeVisible()
      expect(Math.abs(await margenInferior(page, fab(page)) - 83)).toBeLessThanOrEqual(1)
      const flotante = await cajaDe(fab(page))
      expect(seCruzan(flotante, await cajaDe(barra(page)))).toBe(false)
      await expect(page.locator('[data-espacio="72"]')).toHaveCount(1)
      await sinDesborde(page)
    }
  })

  test('servicios no hereda el offset de la barra y no tapa el envío', async ({ page }) => {
    await preparar(page, '/servicios')
    await expect(page.locator('[data-espacio="88"]')).toHaveCount(1)
    await expect(barra(page)).toHaveCount(0)
    expect(Math.abs(await margenInferior(page, fab(page)) - 16)).toBeLessThanOrEqual(1)

    await page.goto('/servicios?vista=busqueda', { waitUntil: 'domcontentloaded' })
    const enviar = page.getByRole('button', { name: 'Enviar solicitud' })
    await expect(enviar).toBeVisible()
    await alFinal(page)
    expect(seCruzan(await cajaDe(fab(page)), await cajaDe(enviar))).toBe(false)
    expect(Math.abs(await margenInferior(page, fab(page)) - 16)).toBeLessThanOrEqual(1)
    await sinDesborde(page)
  })

  test('sin conexión no monta el botón y deja la barra', async ({ page }) => {
    await preparar(page, '/sin-conexion')
    await expect(barra(page)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    await expect(fab(page)).toHaveCount(0)
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
    await sinDesborde(page)
  })

  test('pedidos y perfil usan 83 px con barra y 16 px sin ella', async ({ page }) => {
    await preparar(page, '/mis-pedidos', true)
    await expect(barra(page)).toBeVisible()
    expect(Math.abs(await margenInferior(page, fab(page)) - 83)).toBeLessThanOrEqual(1)

    await page.goto('/mis-pedidos?pedido=1038', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-espacio="88"]')).toHaveCount(1)
    await expect(barra(page)).toHaveCount(0)
    expect(Math.abs(await margenInferior(page, fab(page)) - 16)).toBeLessThanOrEqual(1)

    await page.goto('/perfil', { waitUntil: 'domcontentloaded' })
    await expect(barra(page)).toBeVisible()
    expect(Math.abs(await margenInferior(page, fab(page)) - 83)).toBeLessThanOrEqual(1)

    await page.goto('/perfil?vista=seguridad', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-espacio="88"]')).toHaveCount(1)
    await expect(barra(page)).toHaveCount(0)
    expect(Math.abs(await margenInferior(page, fab(page)) - 16)).toBeLessThanOrEqual(1)
    await sinDesborde(page)
  })

  test('carrito y checkout no montan el botón', async ({ page }) => {
    await preparar(page, '/carrito')
    await expect(fab(page)).toHaveCount(0)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await expect(fab(page)).toHaveCount(0)
    await sinIsotipo(page)
    await sinDesborde(page)
  })
})

test.describe('WhatsApp flotante — desktop 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Home sigue en (1368, 828) y no tapa el pie', async ({ page }) => {
    await preparar(page, '/')
    await sinIsotipo(page)
    const inicio = await cajaDe(fab(page))
    expect(Math.abs(inicio.x - 1368)).toBeLessThanOrEqual(1)
    expect(Math.abs(inicio.y - 828)).toBeLessThanOrEqual(1)
    expect(Math.round(inicio.width)).toBe(56)

    await alFinal(page)
    const flotante = await cajaDe(fab(page))
    const derechos = page.locator('footer p').last()
    await expect(derechos).toBeVisible()
    expect(seCruzan(flotante, await cajaDe(derechos))).toBe(false)
    const terminos = page.locator('footer').getByRole('link', { name: 'Términos', exact: true })
    expect(seCruzan(flotante, await cajaDe(terminos))).toBe(false)
    await sinDesborde(page)
  })

  test('perfil y servicios conservan el margen de 16 px', async ({ page }) => {
    await preparar(page, '/perfil', true)
    const perfil = await cajaDe(fab(page))
    expect(Math.abs(1440 - (perfil.x + perfil.width) - 16)).toBeLessThanOrEqual(1)
    expect(Math.abs(900 - (perfil.y + perfil.height) - 16)).toBeLessThanOrEqual(1)

    await page.goto('/servicios', { waitUntil: 'domcontentloaded' })
    const servicios = await cajaDe(fab(page))
    expect(Math.abs(1440 - (servicios.x + servicios.width) - 16)).toBeLessThanOrEqual(1)
    expect(Math.abs(900 - (servicios.y + servicios.height) - 16)).toBeLessThanOrEqual(1)
    await sinDesborde(page)
  })

  test('carrito y checkout siguen sin el botón', async ({ page }) => {
    await preparar(page, '/carrito')
    await expect(fab(page)).toHaveCount(0)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await expect(fab(page)).toHaveCount(0)
  })

  test('sin conexión en 1440 no monta el botón ni desborda', async ({ page }) => {
    await preparar(page, '/sin-conexion')
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible()
    await expect(fab(page)).toHaveCount(0)
    await sinDesborde(page)
  })
})
