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
    precioVenta: 15000,
    stockActual: 4,
    categoriaId: 7,
    categoria: { id: 7, nombreCategoria: 'Tecnología' },
  },
  {
    id: 2,
    nombreProducto: 'Silla de comedor',
    precioVenta: 45000,
    stockActual: 2,
    categoriaId: 8,
    categoria: { id: 8, nombreCategoria: 'Hogar' },
  },
]

async function mockApis(page: Page) {
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
    if (path.includes('/productos') && !path.includes('/productos/')) {
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
            size: 24,
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
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

async function abrirCategoriaDelMenu(page: Page, nombre: string) {
  await page.getByRole('button', { name: 'Menú' }).click()
  const overlay = page.locator('.hc-mobile-menu')
  await overlay.getByRole('button', { name: 'Productos' }).click()
  await overlay.getByRole('link', { name: nombre }).click()
}

test.describe('Nav móvil — categorías del menú Productos', () => {
  test.use({ viewport: { width: 375, height: 700 } })

  test('click en una categoría filtra el catálogo y cambia al hacer otro click', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await abrirCategoriaDelMenu(page, 'Tecnología')
    await expect(page).toHaveURL(/\/productos\?cat=7/)
    await expect(page.getByRole('heading', { name: 'Tecnología' })).toBeVisible()
    await expect(page.getByText('Mouse gamer RGB')).toBeVisible()
    await expect(page.getByText('Silla de comedor')).toHaveCount(0)

    await abrirCategoriaDelMenu(page, 'Hogar')
    await expect(page).toHaveURL(/\/productos\?cat=8/)
    await expect(page.getByRole('heading', { name: 'Hogar' })).toBeVisible()
    await expect(page.getByText('Silla de comedor')).toBeVisible()
    await expect(page.getByText('Mouse gamer RGB')).toHaveCount(0)
  })

  test('el alias ?categoria= sigue filtrando (links viejos)', async ({ page }) => {
    await mockApis(page)
    await page.goto('/productos?categoria=7', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Tecnología' })).toBeVisible()
    await expect(page.getByText('Mouse gamer RGB')).toBeVisible()
    await expect(page.getByText('Silla de comedor')).toHaveCount(0)
  })
})
