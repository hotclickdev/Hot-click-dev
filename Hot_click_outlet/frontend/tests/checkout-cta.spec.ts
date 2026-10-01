import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function seedPedido(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4 }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

/** Pasos 1 y 2 del checkout móvil (Figma 28:1083 y 29:1248) hasta llegar al pago. */
async function llegarAlPago(page: Page) {
  await page.getByLabel('Correo').fill('ana@example.com')
  await page.getByLabel('Teléfono (WhatsApp)').fill('88881234')
  await page.getByLabel('Nombre completo').fill('Ana Pérez')
  await page.getByRole('button', { name: 'Continuar a entrega' }).click()
  await page.getByLabel('Provincia').selectOption('San José')
  await page.getByLabel('Cantón').selectOption('Escazú')
  await page.getByLabel('Señas exactas').fill('Barrio Escalante, casa 12')
  await page.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo querés pagar?' })).toBeVisible()
}

test.describe('Checkout en tres pasos (Figma 28:1083, 29:1248, 29:1344)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('los datos se validan antes de pasar a la entrega', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Compra segura')).toBeVisible()
    await expect(page.getByRole('heading', { name: '¿A quién le enviamos la confirmación?' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar a entrega' }).click()
    await expect(page.getByRole('heading', { name: '¿A quién le enviamos la confirmación?' })).toBeVisible()
    await expect(page.getByRole('alert').first()).toBeVisible()
  })

  test('pago real primero: SINPE, tarjeta y efectivo; sin pago exprés falso', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await expect(page.getByText('SINPE Móvil').first()).toBeVisible()
    await expect(page.getByText('Tarjeta de crédito o débito')).toBeVisible()
    await expect(page.getByText('Efectivo', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pago exprés' })).toHaveCount(0)
    await expect(page.getByText('Apple Pay')).toHaveCount(0)
    await expect(page.getByText('Google Pay')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Pagar ₡/ })).toBeVisible()
    await expect(page.getByText('📱')).toHaveCount(0)
    await expect(page.getByText('💵')).toHaveCount(0)
  })

  test('el envío internacional es un atajo a WhatsApp y la encomienda se ofrece', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Correo').fill('ana@example.com')
    await page.getByLabel('Teléfono (WhatsApp)').fill('88881234')
    await page.getByLabel('Nombre completo').fill('Ana Pérez')
    await page.getByRole('button', { name: 'Continuar a entrega' }).click()

    const internacional = page.getByRole('link', { name: 'Consultar envío internacional por WhatsApp' })
    await expect(internacional).toBeVisible()
    await expect(internacional).toHaveAttribute('href', /wa\.me\/50686667888/)
    await expect(page.getByText('Encomienda', { exact: true })).toBeVisible()
    await expect(page.getByText('✈️')).toHaveCount(0)
  })

  test('sin aceptar el tratamiento de datos no se inicia el pago', async ({ page }) => {
    let pagos = 0
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/payments/')) pagos += 1
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    })
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)
    await page.getByRole('button', { name: /^Pagar ₡/ }).click()
    expect(pagos).toBe(0)
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('si el pago falla, reintentar es el CTA; WhatsApp es atajo', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/payments/guest-checkout')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'No se pudo iniciar el pago. Intenta de nuevo.' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await page.getByText('Tarjeta de crédito o débito').click()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^Pagar ₡/ }).click()

    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta.getByText('Error al procesar el pago')).toBeVisible()

    const reintentar = alerta.getByRole('button', { name: /Intentar de nuevo/ })
    await expect(reintentar).toBeVisible()
    await expect(reintentar).toHaveClass(/hc-btn-primary/)
    await expect(alerta.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute('href', /consulto/)
    await expect(alerta.getByRole('link', { name: 'Pedir por WhatsApp' })).toHaveCount(0)
  })

  test('checkout vacío: seguir comprando es el CTA primario', async ({ page }) => {
    await mockApis(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })

    const seguir = page.getByRole('link', { name: 'Seguir comprando' })
    await expect(seguir).toBeVisible()
    await expect(seguir).toHaveClass(/hc-btn-primary/)
    await seguir.click()
    await expect(page).toHaveURL(/\/productos/)
  })

  test('SINPE: se registra el pedido y el comprobante elegido se envía solo', async ({ page }) => {
    const llamadas: string[] = []
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      llamadas.push(`${route.request().method()} ${new URL(url).pathname}`)
      if (url.includes('/sinpe/guest-checkout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { proveedor: 'SINPE', numeroPedido: 'ORD-TEST-1', total: 5000, redirectUrl: null } }),
        })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    })
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await page.locator('input[type=file]').first().setInputFiles({
      name: 'comprobante.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    })
    await page.getByLabel('Número de cédula').fill('101110111')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /^Pagar ₡/ }).click()

    await expect(page.getByRole('heading', { name: 'Tu pago está siendo revisado' })).toBeVisible()
    await expect(page.getByText('ORD-TEST-1')).toBeVisible()
    expect(llamadas.some((l) => l.includes('/sinpe/guest/ORD-TEST-1/comprobante'))).toBe(true)
  })
})
