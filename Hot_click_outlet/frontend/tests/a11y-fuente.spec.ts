import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * B3: al abrir la hoja, el chip marcado es A (16 px). A+ sube a fs-lg.
 * D19: A− pone fs-sm (87,5 %, 14 px).
 */

const MENOR = 'A\u2212'

async function preparar(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
  await page.addInitScript(() => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
}

async function abrirHoja(page: Page) {
  await page.locator('footer').getByRole('button', { name: 'Idioma y accesibilidad' }).click()
  return page.getByRole('dialog', { name: 'Idioma y accesibilidad' })
}

function chip(page: Page, nombre: string) {
  return page.getByRole('dialog', { name: 'Idioma y accesibilidad' }).getByRole('button', { name: nombre, exact: true })
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1440', 1440, 900]] as const) {
  test.describe(`Tamaño de fuente (${nombre})`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('al abrir, A está marcado y la raíz sigue en 16 px', async ({ page }) => {
      await preparar(page)
      await abrirHoja(page)
      await expect(chip(page, 'A')).toHaveAttribute('aria-pressed', 'true')
      await expect(chip(page, MENOR)).toHaveAttribute('aria-pressed', 'false')
      await expect(chip(page, 'A+')).toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator('html')).not.toHaveClass(/fs-sm|fs-lg|fs-xl/)
      const raiz = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
      expect(raiz).toBe('16px')
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(desborde).toBeLessThanOrEqual(0)
    })

    test('A+ pone fs-lg y se conserva; A lo quita; A− pone fs-sm (14 px)', async ({ page }) => {
      await preparar(page)
      await abrirHoja(page)
      await chip(page, 'A+').click()
      await expect(page.locator('html')).toHaveClass(/fs-lg/)
      await expect(chip(page, 'A+')).toHaveAttribute('aria-pressed', 'true')
      await expect(chip(page, 'A')).toHaveAttribute('aria-pressed', 'false')

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveClass(/fs-lg/)
      const guardado = await page.evaluate(() => localStorage.getItem('hotclick-ui') ?? '')
      expect(guardado).toContain('"fontSize":"lg"')

      await abrirHoja(page)
      await chip(page, 'A').click()
      await expect(page.locator('html')).not.toHaveClass(/fs-lg|fs-xl/)

      await chip(page, MENOR).click()
      await expect(page.locator('html')).toHaveClass(/fs-sm/)
      await expect(page.locator('html')).not.toHaveClass(/fs-lg|fs-xl/)
      await expect(chip(page, MENOR)).toHaveAttribute('aria-pressed', 'true')
      await expect(chip(page, 'A')).toHaveAttribute('aria-pressed', 'false')
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('14px')

      await chip(page, 'A').click()
      await expect(page.locator('html')).not.toHaveClass(/fs-sm|fs-lg|fs-xl/)

      await page.getByRole('button', { name: 'Listo' }).click()
      await expect(page.getByRole('dialog', { name: 'Idioma y accesibilidad' })).toHaveCount(0)
    })
  })
}
