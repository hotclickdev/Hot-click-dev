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

async function silenciarOverlays(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

/** Acordeón de la plantilla 28:1660: la primera pregunta arranca abierta, así que solo se toca si está cerrada. */
async function abrir(page: Page, pregunta: string) {
  const boton = page.getByRole('button', { name: pregunta })
  if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
}

test.describe('Información — cómo comprar', () => {
  test('enseña pedido, datos y pago; no WhatsApp como checkout', async ({ page }) => {
    await mockApis(page)
    await silenciarOverlays(page)
    await page.goto('/informacion', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '¿Cómo comprar?' })).toBeVisible()
    // Plantilla 28:1660: los pasos son una lista numerada, no encabezados.
    const pasos = page.locator('#como-comprar')
    await expect(pasos.getByText('Agregá al pedido', { exact: true })).toBeVisible()
    await expect(pasos.getByText('Datos y pago', { exact: true })).toBeVisible()
    await expect(pasos.getByText('Confirmación', { exact: true })).toBeVisible()
    await expect(page.getByText('Enviá tu pedido por WhatsApp')).toHaveCount(0)
    await expect(page.getByText(/Pedir por WhatsApp/)).toHaveCount(0)

    await abrir(page, '¿Cuáles son los métodos de pago aceptados?')
    await expect(page.getByText(/El pago se cierra en el checkout/)).toBeVisible()
    await expect(page.getByText(/Todo se coordina directamente por WhatsApp/)).toHaveCount(0)

    await expect(page.locator('#envios').getByText('Envío rápido', { exact: true })).toBeVisible()
    await expect(page.getByText('Uber Flash')).toHaveCount(0)
    await expect(page.getByText('Coordinamos el envío por WhatsApp antes de confirmar')).toHaveCount(0)

    await abrir(page, '¿Qué opciones de envío tienen?')
    await expect(page.getByText(/En el checkout elegís/)).toBeVisible()
    await expect(page.getByText(/se coordina por WhatsApp antes de confirmar el pedido/)).toHaveCount(0)

    await expect(page.getByText('1 hora de cortesía al consultar', { exact: true })).toBeVisible()
    await expect(page.getByText(/Cuando nos contactás por WhatsApp con interés/)).toHaveCount(0)
    await expect(page.getByText(/WhatsApp no aparta el artículo como compra/)).toBeVisible()

    await abrir(page, '¿Se aparta un producto por WhatsApp?')
    await expect(page.getByText(/El stock se confirma al cerrar el pedido/)).toBeVisible()

    await expect(page.getByText('Reportá el fallo', { exact: true })).toBeVisible()
    await expect(page.getByText('Contáctanos por WhatsApp', { exact: true })).toHaveCount(0)

    await abrir(page, '¿Cuántos días de garantía tienen los productos?')
    await expect(page.getByText(/reportalo desde Mis pedidos/)).toBeVisible()

    await abrir(page, '¿Cómo aplico la garantía?')
    await expect(page.getByText(/describí el problema y adjuntá/)).toBeVisible()

    // El CTA final "¿Listo para comprar?" no está en la plantilla 28:1660 (eliminado, ver ELIMINADOS_VISITANTE.md).
    await expect(page.getByRole('heading', { name: '¿Listo para comprar?' })).toHaveCount(0)
    await expect(page.getByText('✓')).toHaveCount(0)
  })
})
