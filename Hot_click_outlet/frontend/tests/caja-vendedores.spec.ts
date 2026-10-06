import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

const PRODUCTO = {
  id: 1,
  nombreProducto: 'Mouse',
  precioVenta: 5000,
  stockActual: 4,
}

const PLANES = [
  { plan: 'EMPRENDEDOR', ruta: '/emprendedor/pos' },
  { plan: 'PYME', ruta: '/pyme/pos' },
  { plan: 'NEGOCIO_PLUS', ruta: '/negocio-plus/pos' },
] as const

function authVendedor() {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'vendedor@hotclick.test',
      userRole: 'EMPRENDEDOR',
      userName: 'Vendedor',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  }
}

async function mockCaja(page: Page, planNombre: string) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { planNombre, features: {}, estadoPlan: 'ACTIVO' },
        }),
      })
      return
    }
    if (path.includes('/pos/caja/activo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, estado: 'ABIERTA' } }),
      })
      return
    }
    if (path.includes('/productos/pos/categoria/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [PRODUCTO] }),
      })
      return
    }
    if (path.includes('/productos/pos/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, nombreCategoria: 'Accesorios' }] }),
      })
      return
    }
    if (path.includes('/pos/venta') && route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.setItem('hc-mm-v1-welcome-seller-done', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, authVendedor())
}

test.describe('Caja de vendedores', () => {
  for (const { plan, ruta } of PLANES) {
    test(`${plan} abre la caja, cobra y el historial no vuelve a /admin`, async ({ page }) => {
      await mockCaja(page, plan)
      await page.setViewportSize({ width: 1280, height: 800 })

      await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(new RegExp(`${ruta.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByRole('heading', { name: 'Caja (POS)' })).toBeVisible()

      await page.getByRole('button', { name: 'Accesorios' }).click()
      await page.getByRole('button', { name: /Mouse/ }).click()
      await page.getByRole('button', { name: /Cobrar/i }).first().click()
      await expect(page.getByText('Método de pago')).toBeVisible()

      await page.getByRole('link', { name: 'Historial' }).click()
      await expect(page).toHaveURL(new RegExp(`${ruta.replace(/\//g, '\\/')}/historial`))
      await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible()
      await expect(page).not.toHaveURL(/\/admin/)
    })
  }

  test('el admin de plataforma no abre la caja ni el panel viejo', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await page.addInitScript((auth) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(auth))
      localStorage.setItem('hc-mm-v1-off', '1')
      localStorage.setItem('hc-mm-v1-welcome-done', '1')
    }, {
      state: {
        token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'ADMIN' }),
        refreshToken: null,
        userId: 1,
        userEmail: 'admin@hotclick.test',
        userRole: 'ADMIN',
        userName: 'Admin',
        empresaId: null,
        empresaSlug: null,
        empresaNombre: 'HOTCLICK',
        permissions: [],
        roles: ['ADMIN'],
      },
      version: 0,
    })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/plataforma\/?$/)
    await expect(page.getByRole('heading', { name: 'Consola de plataforma' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Caja (POS)' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Panel Admin' })).toHaveCount(0)
  })
})
