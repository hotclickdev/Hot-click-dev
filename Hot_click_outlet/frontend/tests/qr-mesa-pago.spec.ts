import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

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

async function preparar(
  page: Page,
  opts: { mesaOk?: boolean; estado?: string; metodo?: string; metodos?: string[]; caja?: string | null } = {},
) {
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
    if (path.endsWith('/comprobante')) {
      return json({
        numeroCobro: 'P-3391',
        empresaNombre: 'Bruma Café',
        caja: 'Caja principal',
        metodoPago: 'SINPE',
        total: 10500,
        items: ITEMS_PAGO,
        fechaPago: '2026-10-02T15:30:00',
        referencia: '3F9A2C1B',
      })
    }
    if (path.includes('/pos/qr/pago/')) {
      return json({
        token: '3f9a2c1b99',
        estado: opts.estado ?? 'PENDIENTE',
        metodoPago: opts.metodo ?? 'SINPE',
        metodosHabilitados: opts.metodos,
        numeroCobro: 'P-3391',
        caja: opts.caja === undefined ? 'Caja principal' : opts.caja,
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
    // B16: sin lector propio, el vencido indica abrir la cámara en lugar del botón «Escanear otro QR».
    await expect(page.getByText('abrí la cámara de tu celular')).toBeVisible()
    await expect(page.getByRole('button', { name: /Escanear otro QR/i })).toHaveCount(0)

    const otra = await page.context().newPage()
    await preparar(otra, { estado: 'PAGADO' })
    await otra.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })
    await expect(otra.getByRole('heading', { name: 'Pago recibido' })).toBeVisible()
    await expect(otra.getByText('Pagaste ₡10.500 a Bruma Café.')).toBeVisible()

    // B16: comprobante del cobro pagado (número, caja, fecha, método y detalle).
    await otra.getByRole('button', { name: 'Ver comprobante' }).click()
    const comprobante = otra.getByTestId('pos-pago-comprobante')
    await expect(comprobante.getByRole('heading', { name: 'Comprobante de pago · Bruma Café' })).toBeVisible()
    await expect(comprobante.getByText('#P-3391')).toBeVisible()
    await expect(comprobante.getByText('Caja principal')).toBeVisible()
    await expect(comprobante.getByText('02/10/2026 15:30')).toBeVisible()
    await expect(comprobante.getByText('SINPE Móvil')).toBeVisible()
    await expect(comprobante.getByText('1 × Funda de silicona para iPhone')).toBeVisible()
    await expect(comprobante.getByRole('button', { name: 'Imprimir o guardar en PDF' })).toBeVisible()
  })

  test('B16: el cliente elige entre los métodos que habilitó la caja; número de cobro y caja', async ({ page }) => {
    await preparar(page, { metodo: 'TARJETA', metodos: ['TARJETA', 'SINPE'] })
    await page.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('pos-pago-cobro')).toHaveText('Cobro #P-3391 · Caja principal')
    const grupo = page.getByRole('radiogroup', { name: 'Elegí cómo pagar' })
    await expect(grupo.getByRole('radio')).toHaveCount(2)
    await expect(grupo.getByRole('radio', { name: /Tarjeta/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: /Pagar con SINPE Móvil/ })).toHaveCount(0)

    await grupo.getByRole('radio', { name: /SINPE Móvil/ }).click()
    await expect(grupo.getByRole('radio', { name: /SINPE Móvil/ })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: /Pagar con SINPE Móvil/ }).click()
    await expect(page.getByRole('heading', { name: 'Pagá con SINPE Móvil' })).toBeVisible()
  })

  test('B16: con un solo método habilitado queda marcado y sin caja no se dibuja', async ({ page }) => {
    await preparar(page, { caja: null })
    await page.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('pos-pago-cobro')).toHaveText('Cobro #P-3391')
    const radios = page.getByRole('radiogroup', { name: 'Elegí cómo pagar' }).getByRole('radio')
    await expect(radios).toHaveCount(1)
    await expect(radios.first()).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('Responsive y tokens (P07)', () => {
  for (const ancho of [390, 1440]) {
    test(`mesa y pago a ${ancho}: columna de 430 px como máximo, sin desborde y colores de SHELL`, async ({ page }) => {
      const errores: string[] = []
      page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
      page.on('pageerror', (e) => errores.push(e.message))
      await preparar(page)
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })

      await page.goto('/checkout/qr/mesa1', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: 'Agregar Caja' }).click()
      expect((await page.locator('main').boundingBox())?.width).toBe(Math.min(ancho, 430))
      const enviar = page.getByRole('button', { name: 'Enviar pedido' })
      await expect(enviar).toHaveCSS('background-color', await colorDeToken(page, '--hc-red-500', 'backgroundColor'))
      await sinDesborde(page)

      await enviar.click()
      await page.getByRole('button', { name: /Realizar pedido/ }).click()
      await expect(page.getByRole('heading', { name: '¡Pedido enviado!' })).toBeVisible()
      const circulo = page.locator('section > span[aria-hidden="true"]').first()
      await expect(circulo).toHaveCSS('background-color', await colorDeToken(page, '--hc-success-bg', 'backgroundColor'))
      await sinDesborde(page)

      await page.goto('/pos/pago/3f9a2c1b99', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Total a pagar')).toBeVisible()
      expect((await page.locator('main').boundingBox())?.width).toBe(Math.min(ancho, 430))
      await sinDesborde(page)
      expect(errores).toEqual([])
    })
  }
})

test('P12 a 390: el buscador de la mesa mide 14 px (29:1650) y no hay WhatsApp flotante en mesa ni pago', async ({ page }) => {
  await preparar(page)
  await page.goto('/checkout/qr/mesa1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('searchbox', { name: 'Buscar en el menú' })).toBeVisible()
  expect(await tamanosDeCampos(page, 'input[type="search"]')).toEqual(['14px'])
  await expect(page.getByRole('link', { name: 'Consultar un producto por WhatsApp', exact: true })).toHaveCount(0)
  await sinDesborde(page)

  await page.goto('/pos/pago/tok1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Total a pagar')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Consultar un producto por WhatsApp', exact: true })).toHaveCount(0)
})
