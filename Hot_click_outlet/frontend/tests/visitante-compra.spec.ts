import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * P1-08 (anexo-6) opción A: `/visitante` quedó deprecado como marketplace
 * paralelo. Estos smoke tests reemplazan a los viejos (que asumían un shell
 * propio en `/visitante/*`) y verifican que los bookmarks redirigen al
 * marketplace real en vez de romper con un 404.
 */
test.describe('Visitante deprecado — redirects a marketplace real (P1-08)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/visitante va a home', async ({ page }) => {
    await page.goto('/visitante', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/$/)
  })

  test('/visitante/shop va a /productos', async ({ page }) => {
    await page.goto('/visitante/shop', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/productos$/)
  })

  test('/visitante/discover va a /descubri', async ({ page }) => {
    await page.goto('/visitante/discover', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/descubri$/)
  })

  test('/visitante/carrito va a /carrito', async ({ page }) => {
    await page.goto('/visitante/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/carrito$/)
  })

  test('/visitante/checkout va al checkout real (bare)', async ({ page }) => {
    await page.goto('/visitante/checkout', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/checkout$/)
  })

  test('/visitante/producto/:id preserva el id hacia /productos/:id', async ({ page }) => {
    await page.goto('/visitante/producto/123', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/productos\/123$/)
  })

  test('/visitante/cuenta va a /perfil (anónimo cae a login, a diferencia del stub Visitante)', async ({ page }) => {
    await page.goto('/visitante/cuenta', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('/visitante/pedidos va a /mis-pedidos (anónimo cae a login)', async ({ page }) => {
    await page.goto('/visitante/pedidos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('/prototipo/visitante/shop (alias legacy) también resuelve a /productos', async ({ page }) => {
    await page.goto('/prototipo/visitante/shop', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/productos$/)
  })
})
