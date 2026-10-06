import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth() {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'ADMIN' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'admin@hotclick.test',
      userRole: 'ADMIN',
      userName: 'Admin',
      empresaId: 1,
      empresaSlug: 'hotclick',
      empresaNombre: 'HOTCLICK',
      permissions: [],
      roles: ['ADMIN'],
    },
    version: 0,
  }
}

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/admin/dashboard') && !url.includes('/kpis')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { totalProductos: 10, totalVentas: 100000, ventasHoy: 0 },
        }),
      })
      return
    }
    if (url.includes('/admin/empresas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, nombreComercial: 'Demo', slug: 'demo', estadoEmpresa: 'ACTIVO' }],
        }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

test.describe('Mental Model coach', () => {
  test('el admin de plataforma no ve el tour del panel viejo', async ({ page }) => {
    await mockApi(page)
    await page.addInitScript((auth) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(auth))
      localStorage.removeItem('hc-admin-tour-v4-done')
      localStorage.removeItem('hc-mm-v1-off')
      localStorage.removeItem('hc-mm-v1-welcome-done')
      localStorage.removeItem('hc-mm-v1:/admin')
    }, payloadAuth())
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Consola de plataforma' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Carga masiva de productos' })).toHaveCount(0)
    await expect(page.locator('#mm-titulo')).toHaveCount(0)
  })
})
