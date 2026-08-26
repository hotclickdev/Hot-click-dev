import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth(rol) {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol }),
      refreshToken: null,
      userId: 1,
      userEmail: `${rol.toLowerCase()}@hotclick.test`,
      userRole: rol,
      userName: rol,
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: [rol],
    },
    version: 0,
  }
}

function diaLocal(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const VENTAS = [
  {
    id: 11,
    fechaCreacion: `${diaLocal(0)}T10:00:00`,
    estado: 'ENTREGADO',
    total: 10000,
    origen: 'POS',
    metodoPago: 'EFECTIVO',
    nombreCliente: 'Ana',
  },
  {
    id: 12,
    fechaCreacion: `${diaLocal(0)}T11:00:00`,
    estado: 'PENDIENTE',
    total: 5000,
    origen: 'ONLINE',
    metodoPago: 'SINPE',
    nombreCliente: 'Luis',
  },
  {
    id: 10,
    fechaCreacion: `${diaLocal(1)}T10:00:00`,
    estado: 'ENTREGADO',
    total: 8000,
    origen: 'POS',
    metodoPago: 'EFECTIVO',
    nombreCliente: 'Ayer',
  },
]

async function entrarDashboard(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/admin/dashboard') && !url.includes('/kpis')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { stockBajo: 4, totalProductos: 20, totalUsuarios: 9, pedidosPendientes: 1, categorias: [] },
        }),
      })
      return
    }
    if (url.includes('/ventas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: VENTAS }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(({ auth, tourKey }) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem(tourKey, '1')
    localStorage.removeItem('hc-sidebar-collapsed')
  }, { auth: payloadAuth('ADMIN'), tourKey: 'hc-admin-tour-v4-done' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
}

test.describe('Admin IT — dashboard de decisiones', () => {
  test('muestra hoy vs ayer, ticket, stock bajo y canal', async ({ page }) => {
    await entrarDashboard(page)

    await expect(page.getByText('Hoy vs ayer — ingresos, pedidos, ticket y stock.')).toBeVisible()
    await expect(page.getByText('Ventas de hoy')).toBeVisible()
    await expect(page.getByText('Pedidos de hoy')).toBeVisible()
    await expect(page.getByText('Ticket promedio')).toBeVisible()
    await expect(page.getByText('Stock bajo')).toBeVisible()
    await expect(page.getByText('Canal de hoy')).toBeVisible()

    await expect(page.getByRole('link', { name: /Ventas de hoy/ })).toContainText('₡10')
    await expect(page.getByRole('link', { name: /Pedidos de hoy/ })).toContainText('2')
    await expect(page.getByText('+25% vs ayer')).toBeVisible()
    await expect(page.getByText('Marketplace')).toBeVisible()
    await expect(page.getByText('usuarios activos')).toHaveCount(0)

    await page.getByRole('link', { name: /Stock bajo/ }).click()
    await expect(page).toHaveURL(/\/admin\/productos/)
  })
})
