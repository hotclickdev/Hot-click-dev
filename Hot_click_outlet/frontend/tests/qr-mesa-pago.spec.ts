import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

// Frames Figma: 29:1650 / 29:1741 (QR de mesa) y 29:1781 / 29:1830 / 29:1888 / 29:1913 (QR de pago).

const MESA = { logoUrl: null, empresaNombre: 'Bruma Café', mesaNombre: 'Mesa 4' }
const PRODUCTOS = [
  { id: 1, nombre: 'Caja', categoria: 'Comidas y bebidas', precio: 2000 },
  { id: 2, nombre: 'Zapatos running rojo', categoria: 'Deportes', precio: 6200 },
  { id: 3, nombre: 'Funda de silicona para iPhone', categoria: 'Accesorios', precio: 8500 },
]
const ITEMS_PAGO = [
  { productoId: 1, nombre: 'Caja', cantidad: 1, precioUnitario: 2000 },
  { productoId: 3, nombre: 'Funda de silicona para iPhone', cantidad: 1, precioUnitario: 8500 },
]

async function preparar(page: Page, opts: { mesaOk?: boolean; estado?: string; metodo?: string } = {}) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const metodo = route.request().method()
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path.endsWith('/qr/mesa1/productos')) return json(opts.mesaOk === false ? { error: 'x' } : PRODUCTOS, opts.mesaOk === false ? 404 : 200)
    if (path.endsWith('/qr/mesa1/pedido') && metodo === 'POST') return json({ numeroPedido: 'Q-58', total: 10500 })
    if (path.endsWith('/qr/mesa1')) return json(MESA, opts.mesaOk === false ? 404 : 200)
    if (path.endsWith('/estado')) return json({ estado: 'PENDIENTE' })
    if (path.endsWith('/intent')) return json({ error: 'sin onvo' }, 400)
    if (path.includes('/pos/qr/pago/')) {
      return json({
        token: '3f9a2c1b9999',
        estado: opts.estado ?? 'PENDIENTE',
        metodoPago: opts.metodo ?? 'SINPE',
        total: 10500,
        empresaNombre: 'Bruma Café',
        items: ITEMS_PAGO,
        sinpeNumero: '+506 7019-6686',
        sinpeRef: '3F9A2C1B',
      })
    }
    return json({ success: true, data: [] })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem(
      'hotclick-cookie-consent',
      JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }),
    )
  })
  await page.setViewportSize({ width: 390, height: 844 })
}

test.describe('QR de mesa', () => {
  test('menú, carrito flotante y pedido enviado', async ({ page }) => {
    await preparar(page)
    await page.goto('/checkout/qr/mesa1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Bruma Café')).toBeVisible()
    await expect(page.getByText('Mesa 4 · pedí desde tu mesa y te lo llevamos')).toBeVisible()
    await expect(page.getByText('Pedido seguro con HotClick')).toBeVisible()
    await expect(page.getByText('₡6.200')).toBeVisible()

    await page.getByRole('button', { name: 'Agregar Caja' }).click()
    await page.getByRole('button', { name: 'Agregar Funda de silicona para iPhone' }).click()
    await expect(page.getByText('2 productos')).toBeVisible()
    await expect(page.getByText('₡10.500')).toBeVisible()

    await page.getByRole('button', { name: 'Enviar pedido' }).click()
    await page.getByRole('button', { name: /Realizar pedido/ }).click()

    await expect(page.getByRole('heading', { name: '¡Pedido enviado!' })).toBeVisible()
    await expect(page.getByText('Bruma Café ya lo recibió. Te lo llevan a la Mesa 4.')).toBeVisible()
    await expect(page.getByText('Pedido #Q-58 · En preparación')).toBeVisible()
    await expect(page.getByText('1 × Caja')).toBeVisible()
    await expect(page.getByText('¿Cómo pagás?')).toBeVisible()

    await page.getByRole('button', { name: 'Agregar algo más' }).click()
    await expect(page.getByRole('button', { name: 'Agregar Caja' })).toBeVisible()
  })

  test('el buscador y las categorías filtran el menú', async ({ page }) => {
    await preparar(page)
    await page.goto('/checkout/qr/mesa1', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Deportes' }).click()
    await expect(page.getByText('Zapatos running rojo')).toBeVisible()
    await expect(page.getByText('Funda de silicona para iPhone')).toHaveCount(0)

    await page.getByRole('button', { name: 'Todo' }).click()
    await page.getByRole('searchbox', { name: 'Buscar en el menú' }).fill('funda')
    await expect(page.getByText('Funda de silicona para iPhone')).toBeVisible()
    await expect(page.getByText('Zapatos running rojo')).toHaveCount(0)
  })

  test('QR inválido muestra el aviso', async ({ page }) => {
    await preparar(page, { mesaOk: false })
    await page.goto('/checkout/qr/mesa1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'QR inválido' })).toBeVisible()
    await expect(page.getByText('Código QR inválido o desactivado')).toBeVisible()
  })
})

test.describe('QR de pago', () => {
  test('SINPE: método elegido, pasos con número y referencia, y registro del pago', async ({ page }) => {
    await preparar(page)
    await page.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Total a pagar')).toBeVisible()
    await expect(page.getByText('₡10.500').first()).toBeVisible()
    await expect(page.getByText('Elegí cómo pagar')).toBeVisible()
    await expect(page.getByText('1 × Caja')).toBeVisible()
    await expect(page.getByText('Pago protegido por HotClick')).toBeVisible()

    await page.getByRole('button', { name: /Pagar con SINPE Móvil/ }).click()
    await expect(page.getByRole('heading', { name: 'Pagá con SINPE Móvil' })).toBeVisible()
    await expect(page.getByText('Enviá ₡10.500 a este número')).toBeVisible()
    await expect(page.getByText('7019-6686')).toBeVisible()
    await expect(page.getByText('3F9A2C1B')).toBeVisible()
    await expect(page.getByText('Esperando tu pago')).toBeVisible()

    await page.getByRole('button', { name: 'Registrar mi pago' }).click()
    await expect(page.getByLabel('Nombre completo')).toBeVisible()
    await expect(page.getByLabel('Cédula')).toBeVisible()
  })

  test('cobro vencido y pago recibido', async ({ page }) => {
    await preparar(page, { estado: 'EXPIRADO' })
    await page.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Este cobro venció' })).toBeVisible()
    await expect(page.getByText('duran 15 minutos')).toBeVisible()

    const otra = await page.context().newPage()
    await preparar(otra, { estado: 'PAGADO' })
    await otra.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })
    await expect(otra.getByRole('heading', { name: 'Pago recibido' })).toBeVisible()
    await expect(otra.getByText('Pagaste ₡10.500 a Bruma Café.')).toBeVisible()
  })
})
