import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Checkout (P03): pasos de Figma 28:1083, 29:1248, 29:1344 a 390 y 30:2385 a 1440 sin desborde
 * horizontal ni errores de consola, campos de 15 px como el frame y tokens de color de SHELL.
 * Los cupones se retiraron: el paso 3 no ofrece campo ni botón de cupón.
 */

/** Catálogo oficial de división territorial con la forma que lee el cliente (lista de provincias → cantones → distritos). */
const DIVISION_TERRITORIAL = [
  { nombre: 'San José', cantones: [{ nombre: 'Escazú', distritos: ['Escazú', 'San Antonio', 'San Rafael'] }, { nombre: 'Santa Ana', distritos: ['Santa Ana'] }] },
  { nombre: 'Alajuela', cantones: [{ nombre: 'Alajuela', distritos: ['Alajuela'] }] },
]
const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * API simulada con la forma vigente de cada endpoint que consulta el checkout; el resto responde vacío.
 * Con `conSesion` agrega una sesión de comprador.
 */
async function preparar(page: Page, conSesion = false) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/division-territorial')) return route.fulfill(json({ success: true, data: DIVISION_TERRITORIAL }))
    return route.fulfill(json({ success: true, data: [] }))
  })
  await page.addInitScript((conSesion) => {
    if (conSesion) {
      localStorage.setItem('hotclick-auth', JSON.stringify({
        state: { token: 'tok-prueba', userId: 1, userEmail: 'a@b.cr', userRole: 'USER', userName: 'Ana Prueba' },
        version: 0,
      }))
    }
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }], cartUpdatedAt: Date.now() },
      version: 0,
    }))
  }, conSesion)
}

/** Campos de texto y selects visibles; `esperados` = cuántos tiene que haber (en móvil el paso 3 no tiene ninguno). */
async function camposDe15px(page: Page, esperados = 1) {
  const tamanos = await tamanosDeCampos(page, 'input:not([type=radio]):not([type=checkbox]), select')
  expect(tamanos.length).toBeGreaterThanOrEqual(esperados)
  if (esperados === 0 && tamanos.length === 0) return
  expect(new Set(tamanos)).toEqual(new Set(['15px']))
}

async function llenarDatosYEntrega(page: Page, movil: boolean, conSesion = false, enEntrega?: () => Promise<void>) {
  if (!conSesion) {
    await page.getByLabel('Correo').fill('ana@example.com')
    await page.getByLabel('Nombre completo').fill('Ana Pérez')
  }
  await page.getByLabel('Teléfono (WhatsApp)').fill('00000002')
  if (movil) await page.getByRole('button', { name: 'Continuar a entrega' }).click()
  await enEntrega?.()
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

    // En móvil los selects y «Señas exactas» viven en el paso 2: se miden ahí; el paso 3 solo trae radios y casillas.
    await llenarDatosYEntrega(page, movil, false, movil ? async () => { await expect(page.getByLabel('Provincia')).toBeVisible(); await camposDe15px(page) } : undefined)
    const consentimiento = page.getByRole('checkbox').first()
    await expect(consentimiento).toBeVisible()
    await sinDesborde(page)
    await camposDe15px(page, movil ? 0 : 1)

    const azul = await colorDeToken(page, '--hc-blue-600')
    await expect(consentimiento).toHaveCSS('accent-color', azul)
    const radioLibre = page.locator('input[type="radio"]:not(:checked)').first()
    await expect(radioLibre).toHaveCSS('border-top-color', await colorDeToken(page, '--hc-n-400'))
    expect(errores).toEqual([])
  })
}

for (const ancho of [390, 1440]) {
  test(`checkout con sesión a ${ancho}: los cupones se retiraron, no hay campo ni botón de cupón`, async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    const movil = ancho === 390
    await preparar(page, true)
    await page.setViewportSize({ width: ancho, height: movil ? 844 : 900 })
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llenarDatosYEntrega(page, movil, true)
    await expect(page.getByRole('checkbox').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /cup[oó]n/i })).toHaveCount(0)
    await expect(page.getByLabel(/cup[oó]n/i)).toHaveCount(0)
    await expect(page.getByText(/tarjeta de regalo|gift card/i)).toHaveCount(0)
    await sinDesborde(page)
    expect(errores).toEqual([])
  })
}
