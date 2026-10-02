import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * B1: "Preferencias de cookies" e "Idioma y accesibilidad" se abren desde el pie de página
 * (Figma `51:2590`, nota E) y el botón flotante con el isotipo ya no existe.
 */

async function prepararHome(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
  await page.addInitScript(() => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    // El comprador ya respondió el aviso: las preferencias se reabren después de haber decidido.
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
}

const pie = (page: Page) => page.locator('footer')
const accesoCookies = (page: Page) => pie(page).getByRole('button', { name: 'Preferencias de cookies' })
const accesoIdioma = (page: Page) => pie(page).getByRole('button', { name: 'Idioma y accesibilidad' })

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1440', 1440, 900]] as const) {
  test.describe(`Accesos del pie (${nombre})`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('los dos accesos están en el pie y no hay desborde horizontal', async ({ page }) => {
      await prepararHome(page)
      await expect(accesoCookies(page)).toBeVisible()
      await expect(accesoIdioma(page)).toBeVisible()
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(desborde).toBeLessThanOrEqual(0)
    })

    test('Preferencias de cookies: abre, cierra y se puede volver a abrir', async ({ page }) => {
      await prepararHome(page)
      for (let vez = 0; vez < 2; vez += 1) {
        await accesoCookies(page).click()
        const hoja = page.getByRole('dialog', { name: 'Preferencias de cookies' })
        await expect(hoja).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(hoja).toHaveCount(0)
      }
      // También se cierra con "Guardar preferencias" y vuelve a abrir.
      await accesoCookies(page).click()
      await page.getByRole('button', { name: 'Guardar preferencias' }).click()
      await expect(page.getByRole('dialog', { name: 'Preferencias de cookies' })).toHaveCount(0)
      await accesoCookies(page).click()
      await expect(page.getByRole('dialog', { name: 'Preferencias de cookies' })).toBeVisible()
    })

    test('Idioma y accesibilidad: abre, el radiogroup conserva roles y teclado, y el foco vuelve al pie', async ({ page }) => {
      await prepararHome(page)
      await accesoIdioma(page).click()
      const hoja = page.getByRole('dialog', { name: 'Idioma y accesibilidad' })
      await expect(hoja).toBeVisible()

      // Los radios se buscan en la página: al cambiar de idioma cambia el nombre accesible del diálogo.
      await expect(page.getByRole('radiogroup')).toBeVisible()
      const espanol = page.getByRole('radio', { name: 'Español' })
      await expect(espanol).toHaveAttribute('aria-checked', 'true')
      // Al abrir, el foco entra en la hoja: queda en el idioma vigente.
      await expect(espanol).toBeFocused()

      await page.keyboard.press('ArrowRight')
      const ingles = page.getByRole('radio', { name: 'English' })
      await expect(ingles).toBeFocused()
      await expect(ingles).toHaveAttribute('aria-checked', 'true')
      await expect(espanol).toHaveAttribute('aria-checked', 'false')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await page.keyboard.press('ArrowLeft')
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')

      await page.keyboard.press('Escape')
      await expect(hoja).toHaveCount(0)
      await expect(accesoIdioma(page)).toBeFocused()

      // Segunda apertura y cierre con "Listo".
      await accesoIdioma(page).click()
      await expect(hoja).toBeVisible()
      await page.getByRole('button', { name: 'Listo' }).click()
      await expect(hoja).toHaveCount(0)
    })

    test('el botón flotante con el isotipo ya no existe y WhatsApp sigue donde estaba', async ({ page }) => {
      await prepararHome(page)
      await expect(page.getByRole('button', { name: /opciones de accesibilidad/i })).toHaveCount(0)
      await expect(page.locator('.hc-isotipo-placa')).toHaveCount(0)

      const whatsapp = page.locator('a[href^="https://wa.me"]')
      await expect(whatsapp).toBeVisible()
      const caja = await whatsapp.boundingBox()
      expect(caja).not.toBeNull()
      // Figma 52:2418: móvil x 318, y 705 (16 px sobre la barra); desktop 16 px de los bordes.
      const esperado = ancho === 390 ? { x: 318, y: 705 } : { x: 1368, y: 828 }
      expect(Math.abs((caja?.x ?? 0) - esperado.x)).toBeLessThanOrEqual(1)
      expect(Math.abs((caja?.y ?? 0) - esperado.y)).toBeLessThanOrEqual(1)
      expect(Math.round(caja?.width ?? 0)).toBe(56)
    })
  })
}

test.describe('Accesos del pie con teclado (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Enter abre cada hoja desde el botón del pie y el foco es visible', async ({ page }) => {
    await prepararHome(page)
    const idioma = accesoIdioma(page)
    await idioma.scrollIntoViewIfNeeded()
    await page.keyboard.press('Tab') // pone al navegador en modo teclado antes de enfocar
    await idioma.focus()
    await expect(idioma).toBeFocused()
    await expect(idioma).toHaveCSS('outline-style', 'solid')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Idioma y accesibilidad' })).toBeVisible()
    await page.keyboard.press('Escape')

    const cookies = accesoCookies(page)
    await cookies.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Preferencias de cookies' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(cookies).toBeFocused()
  })
})
