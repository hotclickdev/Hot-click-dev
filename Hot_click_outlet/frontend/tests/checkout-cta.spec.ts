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

test.describe('Checkout — pago real primero', () => {
  test('no hay pago exprés falso; WhatsApp es atajo', async ({ page }) => {
    await mockApis(page)
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Método de pago' })).toBeVisible()
    await expect(page.getByText('SINPE Móvil')).toBeVisible()
    await expect(page.getByText('Visa / Mastercard')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Pago exprés' })).toHaveCount(0)
    await expect(page.getByText('Apple Pay')).toHaveCount(0)
    await expect(page.getByText('Google Pay')).toHaveCount(0)

    const whatsapp = page.getByRole('button', { name: 'Consultar por WhatsApp' })
    await expect(whatsapp).toBeVisible()
    await expect(whatsapp).not.toHaveClass(/hc-btn-primary/)
    await expect(page.getByRole('button', { name: 'Pedir por WhatsApp' })).toHaveCount(0)

    const pagar = page.getByRole('button', { name: /Pagá/ })
    await expect(pagar).toBeVisible()
    await expect(pagar).toHaveClass(/hc-btn-primary/)

    const internacional = page.getByRole('link', { name: 'Consultar envío internacional por WhatsApp' })
    await expect(internacional).toBeVisible()
    await expect(internacional).toHaveAttribute('href', /wa\.me\/50686667888/)
    await expect(page.getByText('Consultar →')).toHaveCount(0)
    await expect(page.getByText('✈️')).toHaveCount(0)
    await expect(page.getByText('Coordinar vía WhatsApp')).toHaveCount(0)
    await expect(page.getByText('Tu encomienda preferida')).toBeVisible()
    await expect(page.getByText('🛡')).toHaveCount(0)
    await expect(page.getByText('Garantía')).toBeVisible()
    await expect(page.getByText('Pago seguro')).toBeVisible()
    await expect(page.getByText('📱')).toHaveCount(0)
    await expect(page.getByText('💵')).toHaveCount(0)
    await expect(page.getByText('👤')).toHaveCount(0)
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

    await page.getByText('Visa / Mastercard').click()
    await page.getByRole('textbox', { name: 'Correo electrónico *' }).fill('ana@example.com')
    await page.getByLabel(/Dirección completa/).fill('San José, Barrio Escalante, casa 12')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /Pagá/ }).click()

    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta.getByText('Error al procesar el pago')).toBeVisible()

    const reintentar = alerta.getByRole('button', { name: /Intentar de nuevo/ })
    await expect(reintentar).toBeVisible()
    await expect(reintentar).toHaveClass(/hc-btn-primary/)

    await expect(alerta.getByRole('link', { name: 'Consultar por WhatsApp' })).toBeVisible()
    await expect(alerta.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute('href', /consulto/)
    await expect(alerta.getByRole('link', { name: 'Pedir por WhatsApp' })).toHaveCount(0)
    await expect(page.getByText('Continuar compra por WhatsApp')).toHaveCount(0)
    await expect(page.getByText('HotClick AI')).toHaveCount(0)
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

  test('SINPE pendiente: enviar comprobante es primario; WhatsApp es atajo', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/sinpe/guest-checkout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              proveedor: 'SINPE',
              numeroPedido: 'ORD-TEST-1',
              total: 5000,
              redirectUrl: null,
            },
          }),
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

    await page.getByText('SINPE Móvil').click()
    await page.locator('#sinpe-nombre').fill('Ana Pérez')
    await page.locator('#sinpe-cedula').fill('101110111')
    await page.getByRole('textbox', { name: 'Correo electrónico *' }).fill('ana@example.com')
    await page.getByLabel(/Dirección completa/).fill('San José, Barrio Escalante, casa 12')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /Pagá/ }).click()

    await expect(page.getByText('Pedido registrado — realizá tu SINPE')).toBeVisible()
    await expect(page.getByText('Tu pedido está vacío')).toHaveCount(0)
    const enviar = page.getByRole('button', { name: 'Enviar comprobante' })
    await expect(enviar).toBeVisible()
    await expect(enviar).toHaveClass(/hc-btn-primary/)
    await expect(page.getByRole('button', { name: 'Notificar también por WhatsApp' })).toHaveCount(0)
    await expect(page.getByText('ORD-TEST-1')).toBeVisible()
  })
})
