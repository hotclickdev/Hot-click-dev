import { test, expect, type Locator, type Page } from '@playwright/test'
import { sinDesborde } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/** P14 (estados globales): texto largo sin espacios y errores de API en superficies del comprador. */
const PALABRA = 'Termoaislantesuperresistenteinoxidableconcierreherm\u00e9ticoydoblepared'
const NOMBRE = `${PALABRA} edici\u00f3n limitada para regalos corporativos`
const TIENDA = 'Distribuidoraartesanalcostarricensedeproductossostenibles'
const PRODUCTO = {
  id: 1, nombreProducto: NOMBRE, precioVenta: 12500, stockActual: 3,
  empresaNombre: TIENDA, empresaSlug: 'larga', descripcion: `${PALABRA} ${PALABRA}`,
}
const EMPRESA = { slug: 'larga', nombreComercial: TIENDA, tagline: PALABRA, descripcion: PALABRA, zonaEnvio: PALABRA, whatsapp: '50688887777' }
const ANCHOS = [390, 1440]

async function simularApi(page: Page, { estado = 200, carrito = false, favorito = false } = {}) {
  await page.addInitScript(([nombre, tienda, conCarrito, conFavorito]) => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    if (conCarrito) {
      const item = { id: 1, nombre, precio: 12500, cantidad: 1, stock: 3, empresaNombre: tienda, empresaId: 3 }
      localStorage.setItem('hotclick-cart', JSON.stringify({ state: { items: [item], cartUpdatedAt: Date.now() }, version: 0 }))
    }
    if (conFavorito) {
      localStorage.setItem('hotclick-wishlist', JSON.stringify({ state: { items: [{ id: 1, nombre, precio: 12500, imagenUrl: null }] }, version: 0 }))
    }
  }, [NOMBRE, TIENDA, carrito, favorito] as const)
  await page.route('**/api/**', (route) => {
    if (estado !== 200) return route.fulfill({ status: estado, contentType: 'application/json', body: '{}' })
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path === '/api/tienda/larga') data = EMPRESA
    else if (path.endsWith('/productos/1')) data = PRODUCTO
    else if (path.endsWith('/productos')) data = { content: [PRODUCTO], totalElements: 1, totalPages: 1, number: 0, size: 20 }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
}

/** El texto cabe en su caja y en la pantalla: parte la palabra o, si el diseño lo trunca, muestra puntos suspensivos. */
async function textoSinCorte(texto: Locator) {
  await expect(texto).toBeVisible()
  const medida = await texto.evaluate((e) => ({
    sobra: getComputedStyle(e).textOverflow === 'ellipsis' ? 0 : e.scrollWidth - e.clientWidth,
    derecha: e.getBoundingClientRect().right,
    pantalla: document.documentElement.clientWidth,
  }))
  expect(medida.sobra).toBeLessThanOrEqual(1)
  expect(medida.derecha).toBeLessThanOrEqual(medida.pantalla)
}

for (const ancho of ANCHOS) {
  test.describe(`P14 estados globales ${ancho}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    })

    test('ficha con nombre, tienda y descripci\u00f3n largos sin cortes', async ({ page }) => {
      await simularApi(page)
      await page.goto('/productos/1')
      await textoSinCorte(page.getByRole('heading', { level: 1, name: NOMBRE }))
      await textoSinCorte(page.getByText(TIENDA, { exact: true }).first())
      await textoSinCorte(page.getByText(`${PALABRA} ${PALABRA}`, { exact: true }).first())
      await sinDesborde(page)
    })

    test('pedido con nombre y tienda largos sin cortes', async ({ page }) => {
      await simularApi(page, { carrito: true })
      await page.goto('/carrito')
      await textoSinCorte(page.getByText(NOMBRE, { exact: true }).first())
      await textoSinCorte(page.getByRole('heading', { level: 2, name: new RegExp(TIENDA) }).first())
      await sinDesborde(page)
    })

    test('perfil de tienda con nombre y datos largos sin cortes', async ({ page }) => {
      await simularApi(page)
      await page.goto('/tienda/larga')
      await textoSinCorte(page.getByRole('heading', { level: 1, name: TIENDA }))
      await textoSinCorte(page.getByText(PALABRA, { exact: true }).first())
      await sinDesborde(page)
    })

    test('aviso flotante con nombre largo dentro de la pantalla', async ({ page }) => {
      await simularApi(page, { favorito: true })
      await page.goto('/productos')
      const aviso = page.getByRole('status').filter({ hasText: 'Solo quedan 3 unidades' }).first()
      await expect(aviso).toBeVisible()
      await expect.poll(() => aviso.evaluate((e) => e.getBoundingClientRect().right <= document.documentElement.clientWidth - 16)).toBe(true)
      await textoSinCorte(aviso.locator('p'))
    })

    test('errores del servidor muestran el estado de cada detalle', async ({ page }) => {
      await simularApi(page, { estado: 500 })
      await page.goto('/productos/1')
      await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible()
      await sinDesborde(page)
      await page.goto('/cotizacion/tok')
      await expect(page.getByRole('heading', { level: 1, name: 'Cotizaci\u00f3n no encontrada' })).toBeVisible()
      await sinDesborde(page)
    })
  })
}
