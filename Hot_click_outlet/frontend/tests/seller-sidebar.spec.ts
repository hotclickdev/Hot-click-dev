import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth() {
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

async function entrarVendedor(page: Page, planNombre: 'PYME' | 'NEGOCIO_PLUS', destino: string) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { planNombre, features: {} } }),
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
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
  }, payloadAuth())
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(destino, { waitUntil: 'domcontentloaded' })
}

function sidebar(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación vendedor' })
}

test.describe('Sidebar PYME y Negocio Plus', () => {
  test('PYME alinea Operar/Inventario/Negocio con Emp; Equipo sin Sucursales', async ({ page }) => {
    await entrarVendedor(page, 'PYME', '/pyme')
    const nav = sidebar(page)

    await expect(nav.getByRole('group', { name: 'Operar' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Inventario' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Negocio' })).toBeVisible()

    await expect(nav.getByRole('link', { name: 'Caja (POS)' })).toHaveAttribute('href', '/admin/pos')
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Tienda' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Mis Bodegas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Mis Productos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Reportes' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Opciones' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Equipo' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Sucursales' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Mis Productos' }).locator('svg')).toBeVisible()
  })

  test('Negocio Plus agrega Sucursales y no Equipo', async ({ page }) => {
    await entrarVendedor(page, 'NEGOCIO_PLUS', '/negocio-plus')
    const nav = sidebar(page)

    await expect(nav.getByRole('link', { name: 'Caja (POS)' })).toHaveAttribute('href', '/admin/pos')
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Mis Bodegas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Sucursales' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Operar' }).getByRole('link', { name: 'Sucursales' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Equipo' })).toHaveCount(0)
  })

  test('al ir a Pedidos, ese ítem queda como página actual', async ({ page }) => {
    await entrarVendedor(page, 'PYME', '/pyme')
    const nav = sidebar(page)

    await nav.getByRole('link', { name: 'Pedidos' }).click()
    await expect(page).toHaveURL(/\/pyme\/pedidos/)
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page')
  })

  test('al ir a Reportes, ese ítem queda como página actual', async ({ page }) => {
    await entrarVendedor(page, 'PYME', '/pyme')
    const nav = sidebar(page)

    await nav.getByRole('link', { name: 'Reportes' }).click()
    await expect(page).toHaveURL(/\/pyme\/reportes/)
    await expect(nav.getByRole('link', { name: 'Reportes' })).toHaveAttribute('aria-current', 'page')
  })
})
