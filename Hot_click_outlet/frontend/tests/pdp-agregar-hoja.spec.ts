import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTO = {
  id: 1,
  nombreProducto: 'Mouse',
  precioVenta: 5000,
  stockActual: 4,
}

async function mockFicha(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (/\/api\/productos\/1(?:\?|$)/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: PRODUCTO }),
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

async function silenciarPopups(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

test.describe('Ficha móvil: Agregar abre la hoja "Agregado a tu pedido" (Figma 45:1607)', () => {
  test.beforeEach(async ({ page }) => {
    await mockFicha(page)
    await silenciarPopups(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos/1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Mouse' })).toBeVisible()
  })

  test('Agregar, Ver pedido lleva al carrito sin pedir cuenta', async ({ page }) => {
    await page.getByRole('button', { name: /^Agregar/ }).last().click()
    const hoja = page.getByRole('dialog', { name: 'Agregado a tu pedido' })
    await expect(hoja).toBeVisible()
    await expect(hoja.getByText('Mouse')).toBeVisible()

    await hoja.getByRole('link', { name: 'Ver pedido' }).click()
    await expect(page).toHaveURL(/\/carrito/)
    await expect(page.getByRole('heading', { name: '¿Cómo querés continuar?' })).toHaveCount(0)
  })

  test('Seguir comprando cierra la hoja y deja la ficha en pie', async ({ page }) => {
    await page.getByRole('button', { name: /^Agregar/ }).last().click()
    const hoja = page.getByRole('dialog', { name: 'Agregado a tu pedido' })
    await hoja.getByRole('button', { name: 'Seguir comprando' }).click()
    await expect(hoja).toHaveCount(0)
    await expect(page).toHaveURL(/\/productos\/1/)
  })
})
