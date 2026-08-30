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

test.describe('Envío rápido — se compra en checkout, no por WhatsApp', () => {
  test('en home el CTA va al catálogo y no a wa.me', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Enviamos a todo el país.' }).scrollIntoViewIfNeeded()

    const cta = page.getByRole('link', { name: 'Pedir envío rápido' })
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute('href', /\/productos/)
    await expect(cta).toHaveClass(/hc-btn-primary/)
    await expect(cta).not.toHaveAttribute('href', /wa\.me/)
    await expect(page.getByText('Elegilo en datos y pago')).toBeVisible()

    const seccion = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Enviamos a todo el país.' }) })
    await expect(seccion.getByText('Tarjeta')).toBeVisible()
    await expect(seccion.getByText('pronto')).toHaveCount(0)
  })

  test('en home móvil el envío lleva al catálogo, no a un checkout vacío', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Enviamos a todo el país.' }).scrollIntoViewIfNeeded()

    const seccion = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Enviamos a todo el país.' }) })
    await expect(seccion.getByRole('link', { name: 'Ver catálogo' })).toHaveAttribute('href', /\/productos/)
    await expect(seccion.getByRole('link', { name: /Comprar ahora/ })).toHaveCount(0)
  })

  test('en /envios es un servicio activo, no coordinación por WhatsApp', async ({ page }) => {
    await mockApis(page)
    await page.goto('/envios', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Coordinamos tu envío directamente por WhatsApp')).toHaveCount(0)

    const banner = page.getByRole('link', { name: 'Pedir envío rápido' })
    await expect(banner).toHaveAttribute('href', /\/productos/)
    await expect(banner).toHaveClass(/hc-btn-primary/)

    const card = page.locator('.service-card').filter({ hasText: 'Envío Rápido' })
    await expect(card.getByText('Próximamente')).toHaveCount(0)
    await expect(card.getByText('₡5,000')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Elegirlo en datos y pago' })).toHaveAttribute('href', /\/productos/)

    const encomienda = page.locator('.service-card').filter({ hasText: 'Tu encomienda' })
    await expect(encomienda.getByText('Próximamente')).toHaveCount(0)
    await expect(encomienda.getByText('₡2,500')).toBeVisible()
    await expect(encomienda.getByRole('link', { name: 'Elegirlo en datos y pago' })).toHaveAttribute('href', /\/productos/)

    const cierre = page.locator('.envios-cta')
    await expect(cierre.getByRole('link', { name: 'Rastrear mi pedido' })).toHaveClass(/hc-btn-primary/)
    await expect(cierre.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute('href', /wa\.me\/50686667888/)
    await expect(cierre.getByRole('link', { name: 'Consultar por WhatsApp' })).not.toHaveClass(/hc-btn-primary/)
    await expect(cierre.getByRole('link', { name: /Escribinos por WhatsApp/ })).toHaveCount(0)

    await expect(page.getByText('Tarjeta')).toBeVisible()
    await expect(page.getByText('próximo')).toHaveCount(0)
  })
})
