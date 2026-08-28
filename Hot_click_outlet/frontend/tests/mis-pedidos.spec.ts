import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth() {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'USUARIO_FINAL' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'comprador@hotclick.test',
      userRole: 'USUARIO_FINAL',
      userName: 'Ana',
      empresaId: null,
      empresaSlug: null,
      empresaNombre: null,
      permissions: [],
      roles: ['USUARIO_FINAL'],
    },
    version: 0,
  }
}

const PEDIDO = {
  id: 9,
  numeroPedido: 'ORD-1001',
  estadoPedido: 'LISTO_RETIRO',
  fechaPedido: '2026-08-20T12:00:00',
  totalPedido: 8500,
  metodoEnvio: 'RETIRO_EN_TIENDA',
  items: [{ cantidad: 1, nombreProducto: 'Mouse', precioUnitarioMomento: 8500 }],
}

async function sesionConPedido(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const body = path.includes('/pedidos/usuario/')
      ? { content: [PEDIDO], totalPages: 1 }
      : []
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: body }),
    })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
  }, payloadAuth())
}

test.describe('Mis pedidos — estados sin emoji', () => {
  test('el estado se lee en texto, no con emoji de tienda', async ({ page }) => {
    await sesionConPedido(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/mis-pedidos', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible()
    await expect(page.getByText('ORD-1001')).toBeVisible()
    await expect(page.getByText('Listo p/ retirar')).toBeVisible()
    await expect(page.getByText('🏪')).toHaveCount(0)
    await expect(page.getByText('✅')).toHaveCount(0)

    await page.getByRole('button', { name: /ORD-1001/ }).click()
    await expect(page.getByText('Retiro en tienda')).toBeVisible()
    await expect(page.getByText('✓')).toHaveCount(0)
  })
})
