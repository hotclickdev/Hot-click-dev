import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

// P16: los montos al comprador salen de formatPrice (₡6.200, punto de miles, sin NBSP ni espacio estrecho).
const MONTO_CON_ESPACIO = /₡\d{1,3}[\u00a0\u202f ]\d{3}/

async function preparar(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
  await page.addInitScript(() => {
    localStorage.setItem('hc-cart-email', 'visto@example.com')
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 6200, cantidad: 2, stock: 4 }], cartUpdatedAt: Date.now() },
      version: 0,
    }))
    const ventana = globalThis as unknown as { open: (url?: string) => null; __urlAbierta?: string }
    ventana.open = (url?: string) => {
      ventana.__urlAbierta = url
      return null
    }
  })
}

test.describe('P16 formato de datos', () => {
  test('carrito: montos con punto de miles y sin espacios', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('₡12.400').first()).toBeVisible()
    expect(await page.locator('body').innerText()).not.toMatch(MONTO_CON_ESPACIO)
  })

  test('WhatsApp del carrito lleva el mismo formato', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Pedir por WhatsApp' }).click()
    const url = await page.evaluate(() => (globalThis as unknown as { __urlAbierta?: string }).__urlAbierta ?? '')
    const mensaje = decodeURIComponent(url.split('text=')[1] ?? '')
    expect(mensaje).toContain('x2 — ₡12.400')
    expect(mensaje).toContain('Total: ₡12.400')
    expect(mensaje).not.toMatch(MONTO_CON_ESPACIO)
  })
})
