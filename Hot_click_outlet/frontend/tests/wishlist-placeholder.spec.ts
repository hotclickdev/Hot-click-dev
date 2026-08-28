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

test('wishlist sin foto no usa caja emoji', async ({ page }) => {
  await mockApis(page)
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-wishlist', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }] },
      version: 0,
    }))
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/wishlist', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible()
  await expect(page.getByText('Mouse')).toBeVisible()
  await expect(page.getByText('📦')).toHaveCount(0)
})
