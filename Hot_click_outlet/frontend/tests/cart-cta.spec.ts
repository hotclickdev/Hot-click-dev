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

async function seedPedido(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hc-cart-email', 'visto@example.com')
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

test.describe('Carrito por paquetes (Figma 28:989, 30:2268, 51:1820)', () => {
  test('escritorio: el CTA principal continúa a /checkout', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Tu pedido' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tu pedido llega en 1 paquete' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar cupón' })).toBeVisible()

    const continuar = page.getByRole('button', { name: 'Continuar compra' })
    await expect(continuar).toBeVisible()
    await continuar.click()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('móvil: notas, cupón, gift card, WhatsApp y pie con el total', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Tu pedido (1)')).toBeVisible()
    await expect(page.getByLabel('Notas para el pedido (opcional)')).toBeVisible()
    await expect(page.getByLabel('Código de cupón')).toBeVisible()
    await expect(page.getByLabel('Código de tarjeta de regalo')).toBeDisabled()

    const whatsapp = page.getByRole('button', { name: 'Pedir por WhatsApp' })
    await expect(whatsapp).toBeVisible()
    await expect(page.getByText('Continuar por WhatsApp')).toHaveCount(0)

    await page.getByRole('button', { name: /Continuar compra · ₡/ }).click()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('las notas se escriben en el carrito y el pedido sigue al checkout', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Notas para el pedido (opcional)').fill('Tocar el timbre dos veces')
    await page.getByRole('button', { name: /Continuar compra · ₡/ }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText('¿A quién le enviamos la confirmación?')).toBeVisible()
  })

  test('pedido vacío: ver productos es el CTA primario', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    const ver = page.getByRole('link', { name: 'Ver productos' })
    await expect(ver).toBeVisible()
    await ver.click()
    await expect(page).toHaveURL(/\/productos/)
  })

  test('en el catálogo, Ver pedido abre /carrito', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await page.getByRole('link', { name: /Ver pedido/ }).or(page.getByRole('button', { name: /Ver pedido/ })).first().click()
    await expect(page).toHaveURL(/\/carrito/)
  })

  test('sin foto no muestra caja emoji', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Mouse', { exact: true })).toBeVisible()
    await expect(page.getByText('📦')).toHaveCount(0)
  })
})
