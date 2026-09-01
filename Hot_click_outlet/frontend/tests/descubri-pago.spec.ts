import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const CATEGORIAS = [
  { id: 7, nombreCategoria: 'Tecnología', padreId: null, icono: 'tecnologia' },
  { id: 8, nombreCategoria: 'Hogar', padreId: null, icono: 'hogar' },
]

const PRODUCTOS = [
  {
    id: 1,
    nombreProducto: 'Mouse gamer RGB',
    precioVenta: 8000,
    stockActual: 4,
    categoriaId: 7,
    imagenPrincipalUrl: 'https://example.com/mouse.jpg',
    categoria: { id: 7, nombreCategoria: 'Tecnología' },
  },
  {
    id: 2,
    nombreProducto: 'Silla de comedor',
    precioVenta: 45000,
    stockActual: 2,
    categoriaId: 8,
    imagenPrincipalUrl: 'https://example.com/silla.jpg',
    categoria: { id: 8, nombreCategoria: 'Hogar' },
  },
]

async function mockDescubriApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/categorias/publicas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: CATEGORIAS }),
      })
      return
    }
    if (path.includes('/productos') && !path.match(/\/productos\/\d+/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            content: PRODUCTOS,
            totalElements: PRODUCTOS.length,
            totalPages: 1,
            number: 0,
            size: 100,
          },
        }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-mm-v1-off', '1')
  })
}

test.describe('Descubrí chips', () => {
  test.beforeEach(async ({ page }) => {
    await mockDescubriApis(page)
    await page.addInitScript(() => {
      localStorage.removeItem('hotclick-descubri-gustos')
    })
  })

  test('CTA deshabilitado sin categoría; tras guardar muestra resultados', async ({ page }) => {
    await page.goto('/descubri', { waitUntil: 'domcontentloaded' })

    const accept = page.getByRole('button', { name: /aceptar todo|accept all|aceitar tudo/i })
    if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accept.click()
    }

    await expect(page.getByRole('heading', { name: /descubr|discover|descubra/i })).toBeVisible({ timeout: 20000 })

    const cta = page.getByRole('button', { name: /ver productos para mí|show products for me|ver produtos para mim/i })
    await expect(cta).toBeDisabled({ timeout: 20000 })

    const categoryGroup = page.getByRole('group', { name: /categorías|categories|categorias/i })
    const chips = categoryGroup.getByRole('button')
    await expect(chips.first()).toBeVisible({ timeout: 20000 })
    await chips.first().click()
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')

    await expect(cta).toBeEnabled()
    await cta.click()

    await expect(
      page.getByRole('button', { name: /cambiar gustos|change preferences|mudar preferências/i }),
    ).toBeVisible({ timeout: 15000 })

    const stored = await page.evaluate(() => localStorage.getItem('hotclick-descubri-gustos'))
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { selectedCategoryIds?: string[] }
    expect(parsed.selectedCategoryIds?.length).toBeGreaterThan(0)
  })

  test('sin gustos, según tus gustos pide ir a Descubrí', async ({ page }) => {
    await page.goto('/productos?sort=para_vos', { waitUntil: 'domcontentloaded' })
    const accept = page.getByRole('button', { name: /aceptar todo|accept all|aceitar tudo/i })
    if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accept.click()
    }
    await expect(
      page.getByRole('link', { name: /ir a descubr|go to discover/i }),
    ).toBeVisible({ timeout: 20000 })
  })
})
