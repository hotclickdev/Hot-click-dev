import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Carrito (P04): Figma 51:1820 / 52:2178 a 390 y 30:2268 a 1440 sin desborde horizontal ni errores
 * de consola. Se conservan "Pedir por WhatsApp" y guardar por correo en escritorio (decisión pendiente).
 */
async function preparar(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [
          { id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4, empresaNombre: 'Casa Luna 506', empresaId: 3 },
          { id: 2, nombre: 'Taza', precio: 6200, cantidad: 2, stock: 8, empresaNombre: 'Bruma Café', empresaId: 4 },
        ],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

for (const ancho of [390, 1440]) {
  test(`carrito a ${ancho}: sin desborde horizontal ni errores de consola`, async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    await preparar(page)
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^Tu pedido llega en/ })).toBeVisible()

    const [scroll, cliente] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(scroll).toBeLessThanOrEqual(cliente)
    expect(errores).toEqual([])
  })
}

test('carrito a 1440 (P12): el encabezado del paquete usa n/50 (38:1359) y el header del comprador sigue en blanco', async ({ page }) => {
  await preparar(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /^Tu pedido llega en/ })).toBeVisible()

  const encabezadoPaquete = page.locator('main header.bg-hc-n-50').first()
  await expect(encabezadoPaquete).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-50', 'backgroundColor'))
  await expect(page.locator('header.sticky').first()).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-0', 'backgroundColor'))
  await expect(page.locator('footer').last()).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-0', 'backgroundColor'))
  await sinDesborde(page)
})

const AGREGAR_CUPON = 'Agregar cupón'

for (const ancho of [390, 1440]) {
  test(`cupón inválido a ${ancho} (P13): el aviso usa el alias bg-hc-danger-bg con el color de --hc-danger-bg`, async ({ page }) => {
    await preparar(page)
    await page.route('**/api/cupones/validar**', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Cupón vencido' }) }))
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    // En escritorio el campo vive en el resumen, detrás de "Agregar cupón" (ResumenCarrito).
    if (ancho === 1440) await page.getByRole('button', { name: AGREGAR_CUPON }).click()
    const campo = page.getByRole('textbox', { name: 'Código de cupón' }).locator('visible=true')
    await campo.fill('VENCIDO')
    await campo.press('Enter')
    const aviso = page.getByRole('alert').filter({ hasText: 'Cupón vencido' }).locator('visible=true')
    await expect(aviso).toHaveCSS('background-color', await colorDeToken(page, '--hc-danger-bg', 'backgroundColor'))
    await sinDesborde(page)
  })
}

test('alias de P13: cada clase resuelve al mismo valor que su variable', async ({ page }) => {
  await preparar(page)
  await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
  const valores = await page.evaluate(() => {
    const medir = (clase: string, estilo: string) => {
      const a = document.createElement('div'); a.className = clase
      const b = document.createElement('div'); b.setAttribute('style', estilo)
      document.body.append(a, b)
      const [ca, cb] = [getComputedStyle(a), getComputedStyle(b)]
      const r = [ca.backgroundColor, cb.backgroundColor, ca.color, cb.color, ca.boxShadow, cb.boxShadow, ca.outlineColor, cb.outlineColor]
      a.remove(); b.remove()
      return r
    }
    return [
      medir('bg-hc-danger-bg', 'background-color: var(--hc-danger-bg)'),
      medir('text-hc-text-secondary', 'color: var(--hc-text-secondary)'),
      medir('shadow-hc-1', 'box-shadow: var(--hc-shadow-1)'),
      medir('outline-hc-focus-ring', 'outline-color: var(--hc-focus-ring)'),
    ]
  })
  for (const [bgA, bgB, colA, colB, shA, shB, olA, olB] of valores) {
    expect(bgA).toBe(bgB)
    expect(colA).toBe(colB)
    // La utilidad de sombra antepone las capas de anillo de Tailwind (transparentes); la última es el token.
    expect(shA.endsWith(shB)).toBe(true)
    expect(olA).toBe(olB)
  }
  expect(valores[0][0]).not.toBe('rgba(0, 0, 0, 0)')
  expect(valores[2][4]).not.toBe('none')
})

test('recuperar carrito a 390: tienda y "quedan N" con la forma de GET /cart/abandoned/recover (P11, 29:2036)', async ({ page }) => {
  await preparar(page)
  await page.route('**/api/cart/abandoned/recover/tok-p11', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 7, status: 'EMAIL_ENVIADO', items: [
        { productoId: 1, cantidad: 1, precio: 5000, nombre: 'Mouse', imagenUrl: '', stock: 2, empresaNombre: 'Casa Luna 506' },
        { productoId: 2, cantidad: 1, precio: 6200, nombre: 'Taza', imagenUrl: '', stock: 0, empresaNombre: null },
      ] } }),
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/recuperar-carrito/tok-p11', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText(/^Casa Luna 506 · /)).toBeVisible()
  await expect(page.getByText('Disponible · quedan 2')).toBeVisible()
  await expect(page.getByText(/Disponible · quedan 0/)).toHaveCount(0)
  await sinDesborde(page)
})
