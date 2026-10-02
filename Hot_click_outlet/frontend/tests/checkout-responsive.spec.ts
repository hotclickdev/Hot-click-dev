import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Checkout (P03): pasos de Figma 28:1083, 29:1248, 29:1344 a 390 y 30:2385 a 1440 sin desborde
 * horizontal ni errores de consola, campos de 15 px como el frame y tokens de color de SHELL.
 */
async function preparar(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }], cartUpdatedAt: Date.now() },
      version: 0,
    }))
  })
}

async function sinDesborde(page: Page) {
  const [scroll, cliente] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(scroll).toBeLessThanOrEqual(cliente)
}

async function camposDe15px(page: Page) {
  const tamanos = await page.evaluate(() => Array.from(document.querySelectorAll('input:not([type=radio]):not([type=checkbox]), select'))
    .filter((e) => e.getBoundingClientRect().height > 2)
    .map((e) => getComputedStyle(e).fontSize))
  expect(tamanos.length).toBeGreaterThan(0)
  expect(new Set(tamanos)).toEqual(new Set(['15px']))
}

/** Color que resuelve un token de SHELL, para comparar con el estilo calculado. */
async function colorDeToken(page: Page, token: string) {
  return page.evaluate((t) => {
    const prueba = document.createElement('span')
    prueba.style.color = `var(${t})`
    document.body.appendChild(prueba)
    const color = getComputedStyle(prueba).color
    prueba.remove()
    return color
  }, token)
}

async function llenarDatosYEntrega(page: Page, movil: boolean) {
  await page.getByLabel('Correo').fill('ana@example.com')
  await page.getByLabel('Teléfono (WhatsApp)').fill('88881234')
  await page.getByLabel('Nombre completo').fill('Ana Pérez')
  if (movil) await page.getByRole('button', { name: 'Continuar a entrega' }).click()
  await page.getByLabel('Provincia').selectOption('San José')
  await page.getByLabel('Cantón').selectOption('Escazú')
  await page.getByLabel('Señas exactas').fill('Barrio Escalante, casa 12')
  if (movil) await page.getByRole('button', { name: 'Continuar al pago' }).click()
}

for (const ancho of [390, 1440]) {
  test(`checkout a ${ancho}: sin desborde, sin errores de consola, campos de 15 px y tokens de SHELL`, async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    const movil = ancho === 390
    await preparar(page)
    await page.setViewportSize({ width: ancho, height: movil ? 844 : 900 })
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel('Correo')).toBeVisible()
    await sinDesborde(page)
    await camposDe15px(page)

    await llenarDatosYEntrega(page, movil)
    const consentimiento = page.getByRole('checkbox').first()
    await expect(consentimiento).toBeVisible()
    await sinDesborde(page)
    await camposDe15px(page)

    const azul = await colorDeToken(page, '--hc-blue-600')
    await expect(consentimiento).toHaveCSS('accent-color', azul)
    const radioLibre = page.locator('input[type="radio"]:not(:checked)').first()
    await expect(radioLibre).toHaveCSS('border-top-color', await colorDeToken(page, '--hc-n-400'))
    expect(errores).toEqual([])
  })
}