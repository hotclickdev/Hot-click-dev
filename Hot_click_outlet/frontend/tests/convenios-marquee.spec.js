import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Home — marquee de convenios', () => {
  test('separa nombres con un punto, no con estrella', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await page.route('**/api/convenios/publicos**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, nombre: 'Taller Sol', logoUrl: null }],
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Emprendimientos con convenio').first()).toBeVisible()
    await expect(page.getByText('Taller Sol').first()).toBeVisible()
    await expect(page.getByText('✦')).toHaveCount(0)
  })
})
