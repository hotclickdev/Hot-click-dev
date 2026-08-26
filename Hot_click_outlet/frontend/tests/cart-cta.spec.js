import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function seedPedido(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

test.describe('Carrito — checkout primero', () => {
  test('el CTA principal va a datos y pago; WhatsApp queda como atajo', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Pedido' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Progreso del pedido' }).getByText('Pedido')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vaciar pedido' })).toBeVisible()

    const checkout = page.getByRole('button', { name: 'Continuar a datos y pago' })
    await expect(checkout).toBeVisible()
    await expect(checkout).toHaveClass(/hc-btn-primary/)

    const whatsapp = page.getByRole('button', { name: 'Consultar por WhatsApp' })
    await expect(whatsapp).toBeVisible()
    await expect(whatsapp).not.toHaveClass(/hc-btn-primary/)
    await expect(whatsapp).not.toHaveClass(/bg-\[#25D366\]/)
    await expect(page.getByRole('button', { name: 'Pedir por WhatsApp' })).toHaveCount(0)

    await checkout.click()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('no interrumpe el pedido con compra por WhatsApp', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Continuar por WhatsApp')).toHaveCount(0)
    await expect(page.getByText(/Continuamos la compra por WhatsApp/)).toHaveCount(0)
  })

  test('pedido vacío: explorar productos es el CTA primario', async ({ page }) => {
    await mockApis(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    const explorar = page.getByRole('link', { name: 'Explorar productos' })
    await expect(explorar).toBeVisible()
    await expect(explorar).toHaveClass(/hc-btn-primary/)
    await explorar.click()
    await expect(page).toHaveURL(/\/productos/)
  })

  test('en el catálogo, Ver pedido abre /carrito', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Ver pedido/ }).click()
    await expect(page).toHaveURL(/\/carrito/)
  })

  test('sin foto no muestra caja emoji', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mouse' })).toBeVisible()
    await expect(page.getByText('📦')).toHaveCount(0)
  })
})
