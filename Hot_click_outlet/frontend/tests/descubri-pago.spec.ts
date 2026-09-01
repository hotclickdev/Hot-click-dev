import { test, expect } from '@playwright/test'

test.describe('Descubrí chips', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('hotclick-descubri-gustos')
    })
  })

  test('CTA deshabilitado sin categoría; tras guardar muestra resultados', async ({ page }) => {
    await page.goto('/descubri', { waitUntil: 'domcontentloaded' })

    // Banner de cookies si aparece
    const accept = page.getByRole('button', { name: /aceptar todo|accept all|aceitar tudo/i })
    if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accept.click()
    }

    await expect(page.getByRole('heading', { name: /descubri|discover|descubra/i })).toBeVisible({ timeout: 20000 })

    const cta = page.getByRole('button', { name: /ver productos para mí|show products for me|ver produtos para mim/i })
    await expect(cta).toBeDisabled({ timeout: 20000 })

    const categoryGroup = page.getByRole('group', { name: /categorías|categories|categorias/i })
    const chips = categoryGroup.getByRole('button')
    await expect(chips.first()).toBeVisible({ timeout: 20000 })
    await chips.first().click()
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')

    await expect(cta).toBeEnabled()
    await cta.click()

    await expect(
      page.getByRole('button', { name: /cambiar gustos|change preferences|mudar preferências/i }),
    ).toBeVisible({ timeout: 15000 })

    const stored = await page.evaluate(() => localStorage.getItem('hotclick-descubri-gustos'))
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!) as { selectedCategoryIds?: string[] }
    expect(parsed.selectedCategoryIds?.length).toBeGreaterThan(0)
  })

  test('sin gustos, según tus gustos pide ir a Descubrí', async ({ page }) => {
    await page.goto('/productos?sort=para_vos', { waitUntil: 'domcontentloaded' })
    const accept = page.getByRole('button', { name: /aceptar todo|accept all|aceitar tudo/i })
    if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accept.click()
    }
    await expect(
      page.getByRole('link', { name: /ir a descubri|go to discover|ir a descubra/i }),
    ).toBeVisible({ timeout: 20000 })
  })
})
