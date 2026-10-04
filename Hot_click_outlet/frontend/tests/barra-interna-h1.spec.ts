import { test, expect, type Page } from '@playwright/test'
import { mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const MOVIL = { width: 390, height: 844 }
const ESCRITORIO = { width: 1440, height: 900 }

async function mockVacio(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function sembrarPedido(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', '1')
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

async function ir(page: Page, ruta: string, tam: { width: number; height: number }) {
  await page.setViewportSize(tam)
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
}

async function unSoloH1(page: Page, nombre: string) {
  const titulo = page.getByRole('heading', { level: 1 })
  await expect(titulo).toHaveCount(1)
  await expect(titulo).toHaveText(nombre)
  await expect(titulo).toBeVisible()
}

async function sinDesborde(page: Page) {
  const desborda = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  expect(desborda).toBe(false)
}

/** La barra de Figma `28:1144` mide 51 px. El h1 no debe estirarla. */
async function barraEn51(page: Page) {
  const titulo = page.getByRole('heading', { level: 1 })
  const medida = await titulo.evaluate((nodo) => {
    const estilo = getComputedStyle(nodo)
    const barra = nodo.parentElement?.getBoundingClientRect().height ?? 0
    return {
      barra,
      fontSize: estilo.fontSize,
      letterSpacing: estilo.letterSpacing,
      whiteSpace: estilo.whiteSpace,
    }
  })
  expect(medida.barra).toBeGreaterThanOrEqual(50)
  expect(medida.barra).toBeLessThanOrEqual(52)
  expect(medida.fontSize).toBe('17px')
  expect(medida.letterSpacing === 'normal' || medida.letterSpacing === '0px').toBe(true)
  expect(medida.whiteSpace).toBe('nowrap')
}

test.describe('h1 de la barra interna', () => {
  test('carrito con ítems: el título de la barra es el único h1 en móvil', async ({ page }) => {
    await sembrarCookies(page)
    await sembrarPedido(page)
    await mockVacio(page)
    await ir(page, '/carrito', MOVIL)
    await unSoloH1(page, 'Tu pedido (1)')
    await barraEn51(page)
    await sinDesborde(page)
  })

  test('carrito en escritorio conserva su h1 y oculta el de la barra', async ({ page }) => {
    await sembrarCookies(page)
    await sembrarPedido(page)
    await mockVacio(page)
    await ir(page, '/carrito', ESCRITORIO)
    await unSoloH1(page, 'Tu pedido')
    await sinDesborde(page)
  })

  test('carrito vacío: el h1 sigue siendo el estado vacío, no la barra', async ({ page }) => {
    await sembrarCookies(page)
    await mockVacio(page)
    await ir(page, '/carrito', MOVIL)
    await unSoloH1(page, 'Tu pedido está vacío')
    await expect(page.getByText('Tu pedido', { exact: true })).toBeVisible()
    await sinDesborde(page)
  })

  test('mis pedidos, opiniones, favoritos y blog usan la barra como único h1 en móvil', async ({ page }) => {
    await sembrarSesion(page, { favoritos: true })
    await mockApisAcc(page, { pedidos: [] })
    await ir(page, '/mis-pedidos', MOVIL)
    await unSoloH1(page, 'Mis pedidos')
    await barraEn51(page)

    await ir(page, '/perfil?vista=opiniones', MOVIL)
    await unSoloH1(page, 'Mis opiniones')
    await barraEn51(page)

    await ir(page, '/perfil?vista=seguridad', MOVIL)
    await unSoloH1(page, 'Datos y seguridad')

    await ir(page, '/wishlist', MOVIL)
    await unSoloH1(page, 'Favoritos')

    await ir(page, '/blog', MOVIL)
    await unSoloH1(page, 'Blog HotClick')
    await sinDesborde(page)
  })

  test('blog en escritorio muestra el h1 del contenido, no el de la barra', async ({ page }) => {
    await sembrarCookies(page)
    await mockVacio(page)
    await ir(page, '/blog', ESCRITORIO)
    await unSoloH1(page, 'Blog HotClick')
    await sinDesborde(page)
  })

  test('servicios: la barra es h1 solo si el cuerpo no tiene otro', async ({ page }) => {
    await sembrarCookies(page)
    await mockVacio(page)
    await ir(page, '/servicios', MOVIL)
    await unSoloH1(page, '¿En qué te ayudamos?')
    await expect(page.getByRole('paragraph').filter({ hasText: /^Servicios HOT$/ })).toBeVisible()

    await ir(page, '/servicios?vista=busqueda', MOVIL)
    await unSoloH1(page, 'Te lo conseguimos')
    await barraEn51(page)

    await ir(page, '/servicios?vista=garantia', MOVIL)
    await unSoloH1(page, 'Garantía')

    await ir(page, '/servicios?vista=testimonio', MOVIL)
    await unSoloH1(page, 'Contanos tu experiencia')
    await sinDesborde(page)
  })

  test('descubrir y buscar con foto: un solo h1, el de la barra', async ({ page }) => {
    await sembrarCookies(page)
    await mockVacio(page)
    await ir(page, '/descubri', MOVIL)
    await unSoloH1(page, 'Descubrí')
    await barraEn51(page)

    await ir(page, '/buscar/foto', MOVIL)
    await unSoloH1(page, 'Buscar con una foto')
    await sinDesborde(page)
  })

  test('checkout móvil no inventa un h1: el frame no tiene título de página', async ({ page }) => {
    await sembrarCookies(page)
    await sembrarPedido(page)
    await mockVacio(page)
    await ir(page, '/checkout', MOVIL)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
    await expect(page.getByText('Compra segura')).toBeVisible()
    await sinDesborde(page)
  })
})
