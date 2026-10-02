import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Funciones previas que CHK había quitado sin respaldo explícito de Figma y se restauraron:
 * vaciar pedido, WhatsApp en escritorio, guardar por correo en escritorio, contexto del carrito al
 * asistente global, garantía de 40 días e imprimir en el pago exitoso.
 */

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
}

async function seedPedido(page: Page, { conCorreo }: { conCorreo: boolean }) {
  await page.addInitScript((correo) => {
    if (correo) localStorage.setItem('hc-cart-email', 'visto@example.com')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 2, stock: 4 }], cartUpdatedAt: Date.now() },
      version: 0,
    }))
  }, conCorreo)
}

test.describe('Carrito: funciones restauradas', () => {
  test('escritorio: WhatsApp bajo "Continuar compra" y guardar por correo en la columna de productos', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page, { conCorreo: false })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })

    const continuar = page.getByRole('button', { name: 'Continuar compra' })
    const whatsapp = page.getByRole('button', { name: 'Pedir por WhatsApp' })
    await expect(whatsapp).toBeVisible()
    const [bc, bw] = [await continuar.boundingBox(), await whatsapp.boundingBox()]
    expect(bw!.y).toBeGreaterThan(bc!.y + bc!.height - 1)

    await expect(page.getByRole('heading', { name: '¿Lo terminás después?' })).toBeVisible()
    await expect(page.getByLabel('tu@correo.com')).toBeVisible()
  })

  test('escritorio: quien ya dejó su correo no ve la tarjeta de guardar', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page, { conCorreo: true })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Continuar compra' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '¿Lo terminás después?' })).toHaveCount(0)
  })

  for (const [nombre, ancho, alto] of [['escritorio', 1440, 900], ['móvil', 390, 844]] as const) {
    test(`${nombre}: "Vaciar pedido" deja el carrito vacío`, async ({ page }) => {
      await mockApis(page)
      await seedPedido(page, { conCorreo: true })
      await page.setViewportSize({ width: ancho, height: alto })
      await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Vaciar pedido' }).click()
      await expect(page.getByRole('link', { name: 'Ver productos' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Vaciar pedido' })).toHaveCount(0)
    })
  }

  test('móvil: el asistente recibe el contexto CARRITO:items:total', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page, { conCorreo: true })
    let cuerpo = ''
    await page.route('**/api/public/chat**', async (route) => {
      cuerpo = route.request().postData() ?? ''
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"type":"done"}\n\n' })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('¿Dudas con tu pedido? Preguntale al asistente').press('Enter')
    // La pregunta inicial no se envía sola (ChatModal limpia pendingMessage al abrir: problema previo del asistente global, no de CHK).
    // El contexto sí viaja con cualquier mensaje que se escriba dentro del chat abierto.
    const entrada = page.getByPlaceholder('¿Qué estás buscando?')
    await entrada.fill('¿Llega el viernes?')
    await entrada.press('Enter')
    await expect.poll(() => cuerpo, { timeout: 15_000 }).toContain('CARRITO:Mouse x2:10000')
  })
})

test.describe('Pago exitoso: funciones restauradas', () => {
  test('muestra la garantía de 40 días e Imprimir (window.print)', async ({ page }) => {
    await mockApis(page)
    await page.route('**/api/payments/status/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ estadoPago: 'CAPTURADO', numeroPedido: 'ORD-10482' }) })
    })
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
      ;(window as unknown as { __impreso: number }).__impreso = 0
      window.print = () => { (window as unknown as { __impreso: number }).__impreso += 1 }
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pago/exito?order=ORD-10482', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Tu garantía de 40 días está activa')).toBeVisible()
    await page.getByRole('button', { name: 'Imprimir' }).click()
    expect(await page.evaluate(() => (window as unknown as { __impreso: number }).__impreso)).toBe(1)
    await expect(page.getByRole('link', { name: 'Seguir comprando' })).toBeVisible()
  })
})
