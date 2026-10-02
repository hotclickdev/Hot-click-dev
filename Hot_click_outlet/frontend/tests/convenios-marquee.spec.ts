import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Home — marquee de convenios', () => {
  test('el home no pinta el marquee ni una estrella', async ({ page }) => {
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

    await expect(page.getByText('Emprendimientos con convenio')).toHaveCount(0)
    await expect(page.getByText('Taller Sol')).toHaveCount(0)
    await expect(page.getByText('✦')).toHaveCount(0)
  })
})
