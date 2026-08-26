import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function silenciarOverlays(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

test.describe('Información — cómo comprar', () => {
  test('enseña pedido, datos y pago; no WhatsApp como checkout', async ({ page }) => {
    await mockApis(page)
    await silenciarOverlays(page)
    await page.goto('/informacion', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '¿Cómo comprar?' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Agregá al pedido' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Datos y pago' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Confirmación' })).toBeVisible()
    await expect(page.getByText('Enviá tu pedido por WhatsApp')).toHaveCount(0)
    await expect(page.getByText(/Pedir por WhatsApp/)).toHaveCount(0)

    await page.getByRole('button', { name: '¿Cuáles son los métodos de pago aceptados?' }).click()
    await expect(page.getByText(/El pago se cierra en el checkout/)).toBeVisible()
    await expect(page.getByText(/Todo se coordina directamente por WhatsApp/)).toHaveCount(0)

    await expect(page.getByRole('heading', { name: 'Envío rápido' })).toBeVisible()
    await expect(page.getByText('Uber Flash')).toHaveCount(0)
    await expect(page.getByText('Coordinamos el envío por WhatsApp antes de confirmar')).toHaveCount(0)

    await page.getByRole('button', { name: '¿Qué opciones de envío tienen?' }).click()
    await expect(page.getByText(/En el checkout elegís/)).toBeVisible()
    await expect(page.getByText(/se coordina por WhatsApp antes de confirmar el pedido/)).toHaveCount(0)

    await expect(page.getByRole('heading', { name: '1 hora de cortesía al consultar' })).toBeVisible()
    await expect(page.getByText(/Cuando nos contactás por WhatsApp con interés/)).toHaveCount(0)
    await expect(page.getByText(/WhatsApp no aparta el artículo como compra/)).toBeVisible()

    await page.getByRole('button', { name: '¿Se aparta un producto por WhatsApp?' }).click()
    await expect(page.getByText(/El stock se confirma al cerrar el pedido/)).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Reportá el fallo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Contáctanos por WhatsApp' })).toHaveCount(0)

    await page.getByRole('button', { name: '¿Cuántos días de garantía tienen los productos?' }).click()
    await expect(page.getByText(/reportalo desde Mis pedidos/)).toBeVisible()

    await page.getByRole('button', { name: '¿Cómo aplico la garantía?' }).click()
    await expect(page.getByText(/describí el problema y adjuntá/)).toBeVisible()

    await expect(page.getByRole('heading', { name: '¿Listo para comprar?' })).toBeVisible()
    await expect(page.getByText('✓')).toHaveCount(0)
    const cierre = page.locator('section').filter({ has: page.getByRole('heading', { name: '¿Listo para comprar?' }) })
    await expect(cierre.getByRole('link', { name: 'Ir al catálogo' })).toHaveClass(/hc-btn-primary/)
    await expect(cierre.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute('href', /wa\.me\/50686667888/)
    await expect(cierre.getByRole('link', { name: 'Consultar por WhatsApp' })).not.toHaveClass(/hc-btn-primary/)

    await page.locator('section').filter({ has: page.getByRole('heading', { name: '¿Cómo comprar?' }) })
      .getByRole('link', { name: 'Ir al catálogo' }).click()
    await expect(page).toHaveURL(/\/productos/)
  })
})
