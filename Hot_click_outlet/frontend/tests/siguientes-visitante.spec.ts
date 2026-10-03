import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const prod = (id: number, nombre: string) => ({
  id, nombreProducto: nombre, precioVenta: 5000 + id, stockActual: 5, estado: 1, visibleCatalogo: true, imagenes: [],
})

async function sinBanners(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hc-mm-v1-off', '1')
  })
}

test.describe('ficha · "Más de esta marca"', () => {
  test('muestra otros productos de la tienda, sin el actual', async ({ page }) => {
    await sinBanners(page)
    await page.route('**/api/tienda/*/productos**', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: [prod(284, 'Actual'), prod(9001, 'Lámpara de mesa'), prod(9002, 'Florero de barro')], totalElements: 3 }),
    }))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos/284')
    const fila = page.locator('section[aria-labelledby="mas-de-la-marca"]')
    await expect(fila).toBeVisible({ timeout: 20000 })
    await expect(fila.getByRole('heading', { name: /^Más de / })).toBeVisible()
    await expect(fila.getByText('Lámpara de mesa')).toBeVisible()
    await expect(fila.getByText('Florero de barro')).toBeVisible()
    await expect(fila.getByText('Actual', { exact: true })).toHaveCount(0)
    await expect(fila.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', /^\/(tienda\/|productos\?marcaId=)/)
    const recomendados = await page.locator('#recomendados-producto').boundingBox()
    const marca = await fila.boundingBox()
    expect(marca!.y).toBeGreaterThan(recomendados!.y)
  })

  test('se oculta si la tienda no tiene otros productos', async ({ page }) => {
    await sinBanners(page)
    await page.route('**/api/tienda/*/productos**', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ content: [prod(284, 'Actual')], totalElements: 1 }),
    }))
    await page.goto('/productos/284')
    await expect(page.locator('#recomendados-producto')).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(1500)
    await expect(page.locator('#mas-de-la-marca')).toHaveCount(0)
  })
})

test('pago fallido · la ayuda del asistente abre el chat con la pregunta y el pedido', async ({ page }) => {
  await sinBanners(page)
  await page.route('**/api/payments/status/**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, estadoPago: 'FALLIDO', data: { estadoPago: 'FALLIDO', numeroPedido: 'HC-10482' } }),
  }))
  const cuerpos: string[] = []
  await page.route('**/api/public/chat**', async (r) => {
    cuerpos.push(r.request().postData() ?? '')
    await r.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: delta\ndata: {"text":"No se hizo ningún cobro."}\n\nevent: done\ndata: {}\n\n' })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pago/exito?order=HC-10482')
  const ayuda = page.locator('section[aria-labelledby="ayuda-pago"]')
  await expect(ayuda).toBeVisible({ timeout: 20000 })
  await expect(ayuda.getByRole('button')).toHaveCount(3)
  await expect(ayuda).toContainText('No ve datos de tu tarjeta.')
  await ayuda.getByRole('button', { name: '¿Me cobraron algo?' }).click()
  await expect(page.getByRole('dialog', { name: 'Asistente HotClick' })).toBeVisible()
  // El envío automático de la pregunta (useAiChatEffects, 700 ms) no corre en dev con StrictMode
  // (el efecto se monta dos veces); en el build sí. Con PW_BUILD=1 (vite preview) se verifica completo.
  if (process.env.PW_BUILD) {
    await expect(page.getByRole('dialog')).toContainText('¿Me cobraron algo? (pedido HC-10482)')
    await expect.poll(() => cuerpos.join('\n'), { timeout: 10000 }).toContain('PAGO_FALLO')
  }
})

test('devoluciones · WhatsApp de soporte con el número de HotClick', async ({ page }) => {
  await sinBanners(page)
  await page.goto('/devoluciones')
  const wa = page.getByRole('link', { name: 'Escribinos por WhatsApp' })
  await expect(wa).toBeVisible({ timeout: 20000 })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/50686667888\?text=/)
  await expect(wa).toHaveAttribute('target', '_blank')
  const caja = await wa.boundingBox()
  expect(Math.round(caja!.height)).toBe(48)
  await expect(page.getByText('Soporte HotClick · +506 8666 7888', { exact: false })).toBeVisible()
})
