import { test, expect, type Page } from '@playwright/test'
import { json, prepararNavegador, SIN_DATOS } from '../helpers/agenteFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const CODIGO = 'CODIGOPRUEBA01'

const PRODUCTO = {
  idProducto: 10,
  id: 10,
  nombreProducto: 'Taza azul',
  precioVenta: 5000,
  stockActual: 20,
  imagenPrincipalUrl: '',
  visibleCatalogo: true,
}

type Variante = 'ok' | 'cambio' | 'vencido' | 'pagado'

function enlaceAbierto(variante: Variante) {
  const cambio = variante === 'cambio'
  return {
    vence: '2099-01-01T00:00:00Z',
    reservaHasta: '2099-01-01T00:00:00Z',
    nombreCliente: 'Cliente Prueba',
    telefonoMascara: '***0000',
    precioCambio: cambio,
    stockCambio: false,
    totalCreado: 10000,
    totalActual: cambio ? 12000 : 10000,
    items: [{
      productoId: 10,
      nombre: 'Taza azul',
      imagenUrl: null,
      cantidad: 2,
      cantidadSolicitada: 2,
      precioUnitario: cambio ? 6000 : 5000,
      precioCreado: 5000,
      disponible: true,
    }],
  }
}

/** Mockea el enlace y el producto; "vencido" y "pagado" responden 404 igual que el servidor (no revela cuál fue). */
async function mockEnlace(page: Page, variante: Variante) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes(`/public/enlace/${CODIGO}`)) {
      if (variante === 'vencido' || variante === 'pagado') {
        await json(route, { success: false, message: 'No encontrado' }, 404)
        return
      }
      await json(route, { success: true, data: enlaceAbierto(variante) })
      return
    }
    if (/\/productos\/10$/.test(path)) {
      await json(route, { success: true, data: PRODUCTO })
      return
    }
    await json(route, SIN_DATOS)
  })
}

test.describe('Enlace de compra del bot (/c/:codigo)', () => {
  test('carga el carrito reservado y lleva al checkout de invitado', async ({ page }) => {
    await prepararNavegador(page)
    await mockEnlace(page, 'ok')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/c/${CODIGO}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Tu compra está lista' })).toBeVisible()
    await expect(page.getByText('Taza azul')).toBeVisible()
    await expect(page.getByText('Cantidad: 2')).toBeVisible()

    // El enlace deja el código y el teléfono enmascarado para que el checkout complete el resto en el servidor.
    const guardado = await page.evaluate(() => sessionStorage.getItem('hc-enlace-compra'))
    expect(guardado).toContain(CODIGO)
    expect(guardado).toContain('***0000')

    await page.getByRole('button', { name: 'Ir a pagar' }).click()
    await expect(page).toHaveURL(/\/checkout/)
  })

  test('avisa cuando el precio cambió desde que se creó el enlace', async ({ page }) => {
    await prepararNavegador(page)
    await mockEnlace(page, 'cambio')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/c/${CODIGO}`, { waitUntil: 'domcontentloaded' })

    const aviso = page.getByRole('alert')
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('El precio cambió')
    await expect(page.getByText('Antes', { exact: false }).first()).toBeVisible()
  })

  for (const variante of ['vencido', 'pagado'] as const) {
    test(`enlace ${variante}: muestra "Enlace no disponible" sin revelar el motivo`, async ({ page }) => {
      await prepararNavegador(page)
      await mockEnlace(page, variante)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/c/${CODIGO}`, { waitUntil: 'domcontentloaded' })

      await expect(page.getByRole('heading', { name: 'Enlace no disponible' })).toBeVisible()
      await expect(page.getByText('Este enlace ya fue utilizado o expiró.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Ir a pagar' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Ver productos' })).toBeVisible()
      const guardado = await page.evaluate(() => sessionStorage.getItem('hc-enlace-compra'))
      expect(guardado).toBeNull()
    })
  }
})
