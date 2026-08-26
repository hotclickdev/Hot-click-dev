import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockCatalogoConRopa(page, icono = '👕') {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/categorias/publicas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 10, nombreCategoria: 'Ropa', icono }],
        }),
      })
      return
    }
    if (url.includes('/productos') && !url.includes('/productos/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            content: [{
              id: 1,
              nombreProducto: 'Camisa básica',
              precioVenta: 8500,
              stockActual: 6,
              categoriaId: 10,
              categoria: { id: 10, nombreCategoria: 'Ropa' },
            }],
            totalElements: 1,
            totalPages: 1,
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
}

test('el catálogo pinta el nombre de categoría, no el emoji guardado', async ({ page }) => {
  await mockCatalogoConRopa(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/productos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Ropa').first()).toBeVisible()
  await expect(page.getByText('Camisa básica')).toBeVisible()
  await expect(page.getByText('👕')).toHaveCount(0)
})

test('el catálogo también pinta SVG cuando el icono ya es clave', async ({ page }) => {
  await mockCatalogoConRopa(page, 'ropa')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/productos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Ropa').first()).toBeVisible()
  await expect(page.getByText('Camisa básica')).toBeVisible()
  await expect(page.getByText('👕')).toHaveCount(0)
})

test('ver más del catálogo usa chevron SVG y sigue filtrando', async ({ page }) => {
  await mockCatalogoConRopa(page, 'ropa')
  await page.addInitScript(() => {
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/productos', { waitUntil: 'domcontentloaded' })
  const verMas = page.getByRole('button', { name: 'Ver más' })
  await expect(verMas).toBeVisible()
  await expect(verMas.locator('svg')).toHaveCount(1)
  await verMas.click()
  await expect(page.getByText('Camisa básica')).toBeVisible()
})
