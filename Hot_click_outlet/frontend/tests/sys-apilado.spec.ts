import { test, expect, type Locator, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Apilado de los elementos fijos del sistema (A4). Orden vigente:
 * flotantes 40 < header y barra inferior 50 < tarjeta de instalar 55 < aviso de actualización 60
 * < aviso de cookies 65 < hojas (cupón, salida, idioma y accesibilidad, preferencias) 70.
 * Lo que se comprueba es quién recibe el clic en el centro de cada control.
 */

async function apiVacia(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
}

/** True si el elemento que está encima del centro del control es el propio control (o un hijo). */
async function recibeElClic(control: Locator): Promise<boolean> {
  return control.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const encima = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return encima === el || el.contains(encima)
  })
}

async function sinConsentimiento(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    // 3 páginas vistas: el cupón de bienvenida se ofrece a la tercera, 2 s después.
    sessionStorage.setItem('hc-paginas-sesion', '2')
  })
}

for (const [nombre, ancho, alto] of [['390', 390, 844], ['1440', 1440, 900]] as const) {
  test.describe(`Cupón y aviso de cookies a la vez (${nombre})`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('el aviso de cookies no tapa la hoja del cupón', async ({ page }) => {
      test.setTimeout(60_000)
      await apiVacia(page)
      await sinConsentimiento(page)
      await page.goto('/', { waitUntil: 'domcontentloaded' })

      const campo = page.getByPlaceholder('tu@correo.com')
      await expect(campo).toBeVisible({ timeout: 15_000 })
      // El aviso sale a los 12 s: con la hoja ya abierta no puede quedar encima.
      const aviso = page.getByRole('region', { name: /cookies/i })
      await expect(aviso).toBeVisible({ timeout: 20_000 })

      expect(await recibeElClic(campo)).toBe(true)
      expect(await recibeElClic(page.getByRole('button', { name: 'No gracias' }))).toBe(true)
      expect(await recibeElClic(page.getByRole('button', { name: 'Recibir mi cupón' }))).toBe(true)
    })
  })
}

test.describe('Aviso de cookies sin hojas abiertas (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('queda encima de los flotantes y de la barra, y sus botones reciben el clic', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await page.addInitScript(() => {
      sessionStorage.setItem('hc-return-banner-dismissed', '1')
      localStorage.setItem('hc-promo-seen', String(Date.now()))
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const aviso = page.getByRole('region', { name: /cookies/i })
    await expect(aviso).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1000) // el aviso entra con un resorte; se mide ya asentado
    expect(await recibeElClic(page.getByRole('button', { name: 'Aceptar todo' }))).toBe(true)
    expect(await recibeElClic(page.getByRole('button', { name: 'Solo esenciales' }))).toBe(true)
    expect(await recibeElClic(page.getByRole('button', { name: 'Configurar' }))).toBe(true)
  })
})

test.describe('Hojas contra flotantes y barra inferior (390)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la hoja de accesibilidad queda sobre WhatsApp y la barra, y sus botones reciben el clic', async ({ page }) => {
    await apiVacia(page)
    await page.addInitScript(() => {
      sessionStorage.setItem('hc-return-banner-dismissed', '1')
      localStorage.setItem('hc-promo-seen', String(Date.now()))
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const whatsapp = page.locator('a[href^="https://wa.me"]')
    const barra = page.locator('nav.fixed').getByRole('link').last()
    await expect(whatsapp).toBeVisible()
    // Sin hoja, ambos reciben el clic (nada los tapa).
    expect(await recibeElClic(whatsapp)).toBe(true)
    expect(await recibeElClic(barra)).toBe(true)

    await page.locator('footer').getByRole('button', { name: 'Idioma y accesibilidad' }).click()
    await expect(page.getByRole('button', { name: 'Listo' })).toBeVisible()
    expect(await recibeElClic(page.getByRole('button', { name: 'Listo' }))).toBe(true)
    expect(await recibeElClic(whatsapp)).toBe(false)
    expect(await recibeElClic(barra)).toBe(false)
  })
})
