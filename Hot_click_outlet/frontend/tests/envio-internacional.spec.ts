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

async function assertAtajoInternacional(page: Page) {
  const link = page.getByRole('link', { name: 'Consultar envío internacional por WhatsApp' })
  await expect(link.first()).toBeVisible()
  await expect(link.first()).toHaveAttribute('href', /wa\.me\/50686667888/)
  await expect(page.getByRole('link', { name: /^WhatsApp →$/ })).toHaveCount(0)
}

test.describe('Envío internacional — consulta, no CTA verde', () => {
  test('en home el internacional es atajo muted', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Enviamos a todo el país.' }).scrollIntoViewIfNeeded()
    await assertAtajoInternacional(page)
  })

  test('en /envios el internacional es atajo, no chip de WhatsApp', async ({ page }) => {
    await mockApis(page)
    await page.goto('/envios', { waitUntil: 'domcontentloaded' })
    await assertAtajoInternacional(page)
    await expect(page.getByRole('link', { name: 'Consultar envío internacional por WhatsApp' })).toHaveClass(/card-cta-atajo/)
  })
})
