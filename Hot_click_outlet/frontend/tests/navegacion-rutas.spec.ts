import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * P18: navegación del comprador. «Atrás» devuelve al lugar donde estaba (el catálogo carga sus datos
 * después de montar), un enlace nuevo empieza arriba, las rutas que no existen muestran el 404 y las
 * rutas con sesión mandan al login con retorno.
 */

const MOVIL = { width: 390, height: 844 }
const PRODUCTOS = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, nombre: `Producto ${i + 1}`, precio: 5000 + i, stock: 5, imagenUrl: null, categoriaId: 1, activo: true }))

async function preparar(page: Page, demoraCatalogo = 0) {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const ficha = /\/api\/productos\/(\d+)$/.exec(pathname)
    let data: unknown = []
    if (ficha) {
      data = PRODUCTOS[Number(ficha[1]) - 1]
    } else if (/\/api\/productos\/?$/.test(pathname)) {
      await new Promise((listo) => setTimeout(listo, demoraCatalogo))
      data = { content: PRODUCTOS, totalElements: PRODUCTOS.length, totalPages: 1 }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.setViewportSize(MOVIL)
}

const scrollY = (page: Page) => page.evaluate(() => Math.round(globalThis.scrollY))

test.describe('P18 navegación del comprador', () => {
  test('atrás desde la ficha vuelve a la misma altura del catálogo', async ({ page }) => {
    await preparar(page, 400)
    await page.goto('/productos', { waitUntil: 'networkidle' })
    await expect(page.locator('a[href="/productos/24"]').first()).toBeAttached()
    await page.evaluate(() => globalThis.scrollTo(0, 1500))
    await expect.poll(() => scrollY(page)).toBe(1500)

    const enPantalla = await page.evaluate(() => {
      const enlace = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/productos/"]'))
        .find((a) => { const r = a.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight })
      // Clic sin que Playwright desplace la página para mostrar el enlace: la altura debe ser la del comprador.
      enlace?.click()
      return enlace?.getAttribute('href') ?? ''
    })
    expect(enPantalla).toMatch(/^\/productos\/\d+$/)
    await expect(page).toHaveURL(new RegExp(`${enPantalla}$`))
    await expect.poll(() => scrollY(page)).toBe(0)

    await page.goBack()
    await expect(page).toHaveURL(/\/productos$/)
    await expect.poll(() => scrollY(page), { timeout: 5000 }).toBe(1500)
  })

  test('un enlace nuevo empieza arriba', async ({ page }) => {
    await preparar(page)
    await page.goto('/privacidad', { waitUntil: 'networkidle' })
    await page.evaluate(() => globalThis.scrollTo(0, 1200))
    await expect.poll(() => scrollY(page)).toBe(1200)
    await page.locator('footer a[href="/terminos"]').first().click()
    await expect(page).toHaveURL(/\/terminos$/)
    await expect.poll(() => scrollY(page)).toBe(0)
  })

  for (const ruta of ['/ruta-inexistente', '/tienda/casa-luna/no-existe', '/categorias/x']) {
    test(`404 en ${ruta}`, async ({ page }) => {
      await preparar(page)
      await page.goto(ruta, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeVisible()
    })
  }

  test('ruta con sesión manda al login con retorno', async ({ page }) => {
    await preparar(page)
    await page.goto('/mis-pedidos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmis-pedidos$/)
  })
})
