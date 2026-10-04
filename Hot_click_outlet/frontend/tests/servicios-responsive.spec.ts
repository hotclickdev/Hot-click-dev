import { test, expect, type Page } from '@playwright/test'
import { mockApisAcc, sembrarSesion } from './helpers/accFixtures'
import { colorDeToken, sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Servicios HOT (P06): inicio `28:1429`, formulario `28:1486` y garantía `28:1531` a 390 y 1440,
 * sin desborde horizontal ni errores de consola, campos de 14 px como Figma y fondos de ícono con tokens de SHELL.
 */
const GARANTIA = { productoId: 1, pedidoId: 1048, numeroPedido: 1048, activa: true, diasRestantes: 28, garantiaDias: 40, fechaVencimiento: '2026-10-22', fechaEntrega: '2026-09-12', imagenUrl: '', nombre: 'Auriculares over-ear' }
const FONDOS_INICIO = ['--hc-blue-50', '--hc-success-bg', '--hc-warning-bg', '--hc-red-50']

async function abrir(page: Page, ruta: string, ancho: number) {
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  page.on('pageerror', (e) => errores.push(e.message))
  await sembrarSesion(page)
  await mockApisAcc(page)
  await page.route('**/api/garantias/mis-garantias', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [GARANTIA] }),
  }))
  await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  return errores
}

async function camposDe14px(page: Page) {
  const tamanos = await tamanosDeCampos(page, 'main input:not([type=file]):not([type=radio]), main textarea')
  expect(tamanos.length).toBeGreaterThan(0)
  expect(new Set(tamanos)).toEqual(new Set(['14px']))
}

for (const ancho of [390, 1440]) {
  test(`servicios a ${ancho}: inicio, formulario y garantía sin desborde, campos de 14 px y tokens`, async ({ page }) => {
    const errores = await abrir(page, '/servicios', ancho)
    await expect(page.getByRole('button', { name: /Contanos tu experiencia/ })).toBeVisible()
    const fondos = await page.locator('main button span.size-11').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
    const esperados = await Promise.all(FONDOS_INICIO.map((t) => colorDeToken(page, t, 'backgroundColor')))
    expect(fondos).toEqual(esperados)
    await sinDesborde(page)

    await page.getByRole('button', { name: /Te lo conseguimos/ }).click()
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeVisible()
    await sinDesborde(page)
    await camposDe14px(page)

    await page.goto('/servicios?vista=garantia', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('radio', { name: /Auriculares over-ear/ })).toBeVisible()
    await sinDesborde(page)
    await camposDe14px(page)
    expect(errores).toEqual([])
  })
}