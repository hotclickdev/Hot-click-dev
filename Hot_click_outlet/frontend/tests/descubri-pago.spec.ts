import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const CATEGORIAS = [
  { id: 7, nombreCategoria: 'Tecnología', padreId: null, icono: 'tecnologia' },
  { id: 8, nombreCategoria: 'Hogar', padreId: null, icono: 'hogar' },
]

function producto(id: number, nombre: string, categoriaId: number, precio: number, empresa?: { nombre: string; slug: string }) {
  return {
    id,
    nombreProducto: nombre,
    precioVenta: precio,
    stockActual: 4,
    categoriaId,
    imagenPrincipalUrl: `https://example.com/p${id}.jpg`,
    categoria: { id: categoriaId, nombreCategoria: categoriaId === 7 ? 'Tecnología' : 'Hogar' },
    empresaNombre: empresa?.nombre ?? null,
    empresaSlug: empresa?.slug ?? null,
  }
}

const PRODUCTOS = [
  producto(1, 'Mouse gamer RGB', 7, 8000, { nombre: 'Tech CR', slug: 'tech-cr' }),
  producto(2, 'Teclado mecánico', 7, 22000, { nombre: 'Tech CR', slug: 'tech-cr' }),
  producto(3, 'Auriculares BT', 7, 15000),
  producto(4, 'Silla de comedor', 8, 45000, { nombre: 'Hogar Tico', slug: 'hogar-tico' }),
  producto(5, 'Lámpara LED', 8, 12000),
  producto(6, 'Monitor 24"', 7, 95000),
  producto(7, 'USB-C hub', 7, 9000),
  producto(8, 'Mousepad XL', 7, 6000),
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

async function dismissOverlays(page: Page) {
  const accept = page.getByRole('button', { name: /aceptar todo|accept all|aceitar tudo/i })
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accept.click()
  }
  const noThanks = page.getByRole('button', { name: /no gracias|no thanks|não, obrigado/i })
  if (await noThanks.isVisible({ timeout: 2000 }).catch(() => false)) {
    await noThanks.click()
  }
}

test.describe('Descubrí mazo', () => {
  test.beforeEach(async ({ page }) => {
    await mockDescubriApis(page)
    await page.addInitScript(() => {
      localStorage.removeItem('hotclick-descubri-gustos')
      localStorage.removeItem('hotclick-wishlist')
    })
  })

  test('muestra carta al entrar; 3 likes revelan resultados', async ({ page }) => {
    await page.goto('/descubri', { waitUntil: 'domcontentloaded' })
    await dismissOverlays(page)

    await expect(page.getByRole('heading', { name: /descubr|discover|descubra/i })).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('descubri-mazo')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Mouse gamer RGB')).toBeVisible()
    await expect(page.getByText(/₡\s*8[\s.]?000|₡8,000/)).toBeVisible()

    for (let i = 0; i < 3; i++) {
      await page.getByTestId('descubri-like').click()
    }

    await expect(page.getByTestId('descubri-revelacion').or(page.getByText(/productos para vos|products for you|produtos para você/i))).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/productos para vos|products for you|produtos para você/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /seguir descubriendo|keep discovering|continuar descobrindo/i })).toBeVisible()

    const stored = await page.evaluate(() => localStorage.getItem('hotclick-descubri-gustos'))
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { selectedCategoryIds?: string[]; scores?: Record<string, number> }
    expect(parsed.selectedCategoryIds?.length).toBeGreaterThan(0)
    expect(Object.keys(parsed.scores ?? {}).some((k) => k.startsWith('c:'))).toBe(true)
  })

  test('sin gustos, según tus gustos pide ir a Descubrí', async ({ page }) => {
    await page.goto('/productos?sort=para_vos', { waitUntil: 'domcontentloaded' })
    await dismissOverlays(page)
    await expect(
      page.getByRole('link', { name: /ir a descubr|go to discover/i }),
    ).toBeVisible({ timeout: 20000 })
  })
})
