import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

test.describe('SHELL — rutas y variables globales', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/sin-conexion existe y muestra la pantalla de Figma 45:2264', async ({ page }) => {
    await mockApis(page)
    await page.goto('/sin-conexion', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Estás sin conexión' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })

  test('los inputs del comprador conservan el tamaño de Figma en móvil (15 px en login)', async ({ page }) => {
    await mockApis(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const campo = page.locator('input.hc-input-libre').first()
    await expect(campo).toBeVisible()
    await expect(campo).toHaveCSS('font-size', '15px')
  })

  test('los alias de color existen en el tema', async ({ page }) => {
    await mockApis(page)
    await page.goto('/sin-conexion', { waitUntil: 'domcontentloaded' })
    const alias = await page.evaluate(() => {
      const estilo = getComputedStyle(document.documentElement)
      return ['--color-hc-success-bg', '--color-hc-n-400', '--color-hc-red-50'].map((n) => estilo.getPropertyValue(n).trim())
    })
    expect(alias.every((valor) => valor.length > 0)).toBe(true)
  })
})

test.describe('SHELL — header desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el buscador muestra la búsqueda vigente en el catálogo', async ({ page }) => {
    await mockApis(page)
    await page.goto('/productos?search=taza', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('search').first().getByRole('searchbox')).toHaveValue('taza')
  })
})
