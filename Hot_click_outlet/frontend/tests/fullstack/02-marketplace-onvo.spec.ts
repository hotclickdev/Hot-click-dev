import { test, expect } from '@playwright/test'

/**
 * Flujo 2: compra en marketplace y checkout ONVO.
 * Datos: catálogo semilla del perfil dev (hotclick.seed.catalogo-local=true).
 * Sin ONVO_SECRET_KEY el backend (perfil dev) usa el checkout MOCK: sesión simulada onvo_mock_*, pedido PENDIENTE,
 * redirect a /pago/exito, no llama a ONVO ni cobra. Con onvo_test_ se valida el intento ONVO de prueba. Nunca una llave live.
 * El fail-closed de producción ("ONVO no está configurado") NO se prueba aquí (el E2E usa perfil dev): lo cubren
 * OnvoPaymentProviderModoSimuladoTest.sinPagosFallaCerrado y OnvoArranqueProdGuardTest.
 * Ojo: /api/payments/guest-checkout tiene rate limit 3/60s por IP → una sola llamada por corrida.
 */
// El workflow pasa la llave solo al backend y marca E2E_ONVO_MODO=prueba; la spec nunca ve la llave.
const conOnvo = process.env.E2E_ONVO_MODO === 'prueba'

test.describe('Flujo 2 — marketplace + ONVO', () => {
  test('producto visible en catálogo público y en su ficha', async ({ page, request }) => {
    const res = await request.get('/api/productos?size=5')
    expect(res.ok()).toBeTruthy()
    const productos = (await res.json()).data.content as Array<{ id: number; nombreProducto: string; stockActual: number }>
    const p = productos.find((x) => x.stockActual > 0)
    expect(p, 'semilla con stock').toBeTruthy()
    await page.goto(`/productos/${p!.id}`)
    await expect(page.getByText(p!.nombreProducto).first()).toBeVisible()
  })

  test('guest checkout ONVO: sesión mock PENDIENTE sin llave, intento creado con llave de prueba', async ({ request }) => {
    const prods = (await (await request.get('/api/productos?size=5')).json()).data.content as Array<{ id: number; stockActual: number }>
    const p = prods.find((x) => x.stockActual > 0)!
    const res = await request.post('/api/payments/guest-checkout', {
      data: {
        provider: 'ONVO',
        guestEmail: 'comprador.e2e@example.test',
        guestPhone: '00000004',
        metodoEnvio: 'ENVIO_NORMAL_GAM',
        provincia: 'San José', canton: 'San José', // envío a domicilio exige destino (#448)
        direccionEntrega: 'San José, Calle prueba 1, casa azul',
        items: [{ productoId: p.id, cantidad: 1 }],
      },
    })
    const body = await res.json()
    expect(res.ok(), JSON.stringify(body.message)).toBeTruthy()
    expect(body.success).toBe(true)
    if (!conOnvo) {
      // Mock de dev/test: no marca pagado ni llama a ONVO (el externalId onvo_mock_* no viaja en este endpoint).
      expect(body.data.proveedor).toBe('ONVO')
      expect(body.data.estadoPago).toBe('PENDIENTE')
      expect(body.data.numeroPedido).toBeTruthy()
      expect(body.data.pedidoId).toBeTruthy()
      expect(body.data.redirectUrl).toContain('/pago/exito')
    }
  })
})
