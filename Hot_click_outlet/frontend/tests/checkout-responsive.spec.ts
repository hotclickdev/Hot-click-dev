import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Checkout (P03): pasos de Figma 28:1083, 29:1248, 29:1344 a 390 y 30:2385 a 1440 sin desborde
 * horizontal ni errores de consola, campos de 15 px como el frame y tokens de color de SHELL.
 * P05: tarjeta de regalo válida (55:2220) e inválida (55:2284) en el paso 3 con sesión.
 */
const RESPUESTA_GIFT = { valida: { valida: true, saldoActual: 3000, codigo: 'HC-REGALO' }, invalida: { valida: false } }
type EstadoGift = keyof typeof RESPUESTA_GIFT

/** API simulada; con `gift` agrega sesión y la respuesta de `/gift-cards/validar`. */
async function preparar(page: Page, gift?: EstadoGift) {
  await page.route('**/api/**', async (route) => {
    const data = gift && route.request().url().includes('/gift-cards/validar') ? RESPUESTA_GIFT[gift] : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
  await page.addInitScript((conSesion) => {
    if (conSesion) {
      localStorage.setItem('hotclick-auth', JSON.stringify({
        state: { token: 'tok-prueba', userId: 1, userEmail: 'a@b.cr', userRole: 'USER', userName: 'Ana Prueba' },
        version: 0,
      }))
    }
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }], cartUpdatedAt: Date.now() },
      version: 0,
    }))
  }, Boolean(gift))
}

async function camposDe15px(page: Page) {
  const tamanos = await tamanosDeCampos(page, 'input:not([type=radio]):not([type=checkbox]), select')
  expect(tamanos.length).toBeGreaterThan(0)
  expect(new Set(tamanos)).toEqual(new Set(['15px']))
}

async function llenarDatosYEntrega(page: Page, movil: boolean, conSesion = false) {
  if (!conSesion) {
    await page.getByLabel('Correo').fill('ana@example.com')
    await page.getByLabel('Nombre completo').fill('Ana Pérez')
  }
  await page.getByLabel('Teléfono (WhatsApp)').fill('88881234')
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

for (const ancho of [390, 1440]) {
  for (const gift of ['valida', 'invalida'] as const) {
    test(`tarjeta de regalo ${gift} a ${ancho}: estado del campo, totales y sin desborde`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', (e) => errores.push(e.message))
      const movil = ancho === 390
      await preparar(page, gift)
      await page.setViewportSize({ width: ancho, height: movil ? 844 : 900 })
      await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
      await llenarDatosYEntrega(page, movil, true)
      // En escritorio la tarjeta va dentro del despliegue del cupón del resumen (sin frame propio).
      if (!movil) await page.getByRole('button', { name: 'Agregar cupón' }).click()
      const campo = page.getByLabel('Código de tarjeta de regalo')
      await campo.fill('HC-REGALO')
      await campo.press('Enter')

      if (gift === 'valida') {
        await expect(page.getByText('Tarjeta de regalo válida')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Quitar' })).toBeVisible()
        if (movil) {
          await expect(page.getByText('Total restante a pagar')).toBeVisible()
          await expect(page.getByText('Tarjeta de regalo HC-REGALO')).toBeVisible()
          await expect(page.getByText(/^Pagás el resto con SINPE Móvil o tarjeta/)).toBeVisible()
        } else {
          await expect(page.getByText('Gift card', { exact: true })).toBeVisible()
        }
      } else {
        const alerta = page.getByRole('alert').filter({ hasText: 'Código inválido, vencido o sin saldo' })
        await expect(alerta).toBeVisible()
        await expect(alerta).toHaveCSS('background-color', await colorDeToken(page, '--hc-danger-bg', 'backgroundColor'))
        await expect(page.getByRole('button', { name: 'Quitar' })).toHaveCount(0)
        await expect(page.getByText('Total restante a pagar')).toHaveCount(0)
      }
      await sinDesborde(page)
      expect(errores).toEqual([])
    })
  }
}
