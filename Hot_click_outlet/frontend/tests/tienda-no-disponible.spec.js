import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Tienda pública — no disponible', () => {
  test('404 no parece un 404 genérico del marketplace', async ({ page }) => {
    await page.route('**/api/tienda/demo**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Tienda no encontrada' }),
      }),
    )
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/tienda\/demo/)
    await expect(page.getByRole('heading', { name: 'Esta tienda no está disponible' })).toBeVisible()
    await expect(page.getByText('Esta página no existe')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Esta tienda está empezando' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Pedido de esta tienda' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ver productos en HotClick' })).toHaveAttribute(
      'href',
      '/productos',
    )
  })

  test('si el servidor falla, se puede reintentar', async ({ page }) => {
    await page.route('**/api/tienda/demo**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'error' }),
      }),
    )
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('No se pudo abrir esta tienda')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Esta tienda no está disponible' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })
})
