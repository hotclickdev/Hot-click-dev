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

async function seedPedidoYOverlays(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

test.describe('Asistente — no cobra en el chat', () => {
  test('con pedido, Ir a datos y pago abre /checkout', async ({ page }) => {
    await mockApis(page)
    await seedPedidoYOverlays(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Asistente' }).click()

    const hero = page.getByPlaceholder('Escribí qué buscás...')
    await hero.scrollIntoViewIfNeeded()
    await hero.fill('ofertas')
    await page.getByRole('button', { name: 'Enviar consulta' }).click()

    const dialog = page.getByRole('dialog', { name: 'Asistente HotClick' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Pagar ya')).toHaveCount(0)
    await expect(dialog.getByText('Sin salir del chat')).toHaveCount(0)
    await expect(dialog.getByText('Pagar pedido')).toHaveCount(0)

    const pagar = dialog.getByRole('link', { name: 'Ir a datos y pago' })
    await expect(pagar).toHaveAttribute('href', /\/checkout/)

    const consulta = dialog.getByRole('link', { name: 'Consultar por WhatsApp' })
    await expect(consulta).toHaveAttribute('href', /consulto/)
    const bg = await consulta.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgb(37, 211, 102)')

    await pagar.click()
    await expect(page).toHaveURL(/\/checkout/)
  })
})
