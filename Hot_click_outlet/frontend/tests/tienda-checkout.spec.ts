import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use(process.env.CI ? {} : { channel: 'chrome' })


const EMPRESA = {
  nombreComercial: 'Demo Store',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  whatsapp: '50686667888',
}

async function mockTiendaDemo(page: Page) {
  await page.route('**/api/tienda/demo', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: EMPRESA }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('tienda-carrito', JSON.stringify({
      state: {
        slug: 'demo',
        empresa: { nombreComercial: 'Demo Store' },
        carrito: [{ producto: { id: 1, nombre: 'Mouse', precio: 5000 }, cantidad: 1 }],
      },
      version: 0,
    }))
  })
}

test.describe('Checkout tienda pública', () => {
  test('DOMICILIO exige dirección; el número de pedido vive en la URL', async ({ page }) => {
    await mockTiendaDemo(page)
    await page.goto('/tienda/demo/checkout', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
    await expect(page.getByText('Pedido de Demo Store en HotClick')).toBeVisible()

    const direccion = page.getByLabel(/Dirección de entrega/)
    await expect(direccion).toBeVisible()
    await expect(direccion).toHaveAttribute('required', '')

    const telefono = page.getByLabel(/Teléfono/)
    await expect(telefono).toBeVisible()
    await expect(telefono).toHaveAttribute('required', '')

    await page.getByLabel('Nombre completo *').fill('Ana Pérez')
    await page.getByLabel('Correo electrónico *').fill('ana@ejemplo.com')
    await page.getByLabel(/Dirección de entrega/).fill('San José, Barrio Escalante, casa 12')
    await telefono.fill('1234567')
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    await expect(page.getByText('Indicá un teléfono de contacto (mínimo 8 dígitos).')).toBeVisible()

    await page.getByText('Retiro en tienda').click()
    await expect(direccion).toHaveCount(0)

    await page.getByText('Envío a domicilio').click()
    await expect(page.getByLabel(/Dirección de entrega/)).toBeVisible()

    await page.goto('/tienda/demo/checkout/exito?orden=ORD-TEST123', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('ORD-TEST123')).toBeVisible()
    await expect(page.getByText('Pedido de Demo Store en HotClick')).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('ORD-TEST123')).toBeVisible()
  })
})

test('el pedido de tienda exige teléfono en DTO y no inventa 00000000', () => {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const dto = readFileSync(join(raiz, 'src/main/java/com/hotclick/dto/StorefrontPedidoDTO.java'), 'utf8')
  const servicio = readFileSync(join(raiz, 'src/main/java/com/hotclick/controller/storefront/StorefrontGuestOrderService.java'), 'utf8')
  const pagina = readFileSync(join(raiz, 'frontend/src/pages/tienda/TiendaCheckoutPage.tsx'), 'utf8')
  expect(dto).toContain('TELEFONO_MIN_DIGITOS')
  expect(dto).toContain('@NotBlank(message = "El teléfono de contacto es requerido")')
  expect(servicio).not.toContain('00000000')
  expect(pagina).toContain("tiendaService.crearPedido(slug, { ...form, items: itemsParaPedido() })")
  expect(pagina).toContain('vaciarCarrito()')
  expect(pagina).toContain('Pedido de {empresa?.nombreComercial ?? slug} en HotClick')
})
