import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApiYConsent(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hc-first-visit-ts', String(Date.now() - 3 * 24 * 60 * 60 * 1000))
  })
}

async function abrirPanelA11y(page: Page) {
  const trigger = page.getByRole('button', { name: /opciones de accesibilidad|accessibility options|opções de acessibilidade/i })
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function elegirIdioma(page: Page, nombre: RegExp) {
  const radio = page.getByRole('radio', { name: nombre })
  await expect(radio).toBeVisible()
  await radio.click()
}

test.describe('Cambio de idioma accesible', () => {
  test('panel a11y cambia a English, actualiza html lang y navbar, y persiste', async ({ page }) => {
    await mockApiYConsent(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('lang', 'es')

    await abrirPanelA11y(page)
    await elegirIdioma(page, /^English$/i)

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('link', { name: /^Products$/i }).first()).toBeVisible()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('link', { name: /^Products$/i }).first()).toBeVisible()
  })

  test('panel a11y cambia a Português', async ({ page }) => {
    await mockApiYConsent(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await abrirPanelA11y(page)
    await elegirIdioma(page, /^Português$/i)

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
    await expect(page.getByRole('link', { name: /^Produtos$/i }).first()).toBeVisible()
  })

  test('radiogroup de idioma es operable con teclado', async ({ page }) => {
    await mockApiYConsent(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await abrirPanelA11y(page)

    const es = page.getByRole('radio', { name: /^Español$/i })
    await es.focus()
    await expect(es).toBeFocused()
    await expect(es).toHaveAttribute('aria-checked', 'true')

    await page.keyboard.press('ArrowRight')
    const en = page.getByRole('radio', { name: /^English$/i })
    await expect(en).toBeFocused()
    await expect(en).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.keyboard.press('ArrowRight')
    const pt = page.getByRole('radio', { name: /^Português$/i })
    await expect(pt).toBeFocused()
    await expect(pt).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  })

  test('catálogo refleja idioma tras cambio', async ({ page }) => {
    await mockApiYConsent(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await abrirPanelA11y(page)
    await elegirIdioma(page, /^English$/i)

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByPlaceholder(/search products/i)).toBeVisible()
  })
})
