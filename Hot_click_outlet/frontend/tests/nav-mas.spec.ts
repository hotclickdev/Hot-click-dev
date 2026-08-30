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

test.describe('Nav Más — Descubrí sin borrar páginas', () => {
  test('desktop: Descubrí vive en Más y abre /descubri', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Productos' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Servicios HOT' })).toBeVisible()
    await expect(header.getByRole('link', { name: 'Emprender' })).toBeVisible()

    await page.getByRole('button', { name: 'Más' }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Descubrí' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Vender' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Servicios HOT' })).toHaveCount(0)
    await menu.getByRole('menuitem', { name: 'Descubrí' }).click()
    await expect(page).toHaveURL(/\/descubri/)
  })

  test('móvil: Descubrí está en el hamburger, no en BottomNav', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('nav.hc-bottom-nav').getByRole('link', { name: 'Descubrí' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Menú' }).click()
    const overlay = page.locator('.hc-mobile-menu')
    await expect(overlay.getByRole('link', { name: 'Servicios HOT' })).toBeVisible()
    await expect(overlay.getByRole('link', { name: 'Emprender' })).toBeVisible()
    await expect(overlay.getByRole('link', { name: 'Descubrí' })).toBeVisible()
    await expect(overlay.getByRole('link', { name: 'Vender' })).toBeVisible()
    await overlay.getByRole('link', { name: 'Descubrí' }).click()
    await expect(page).toHaveURL(/\/descubri/)
  })
})
