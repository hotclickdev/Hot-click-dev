import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth(rol: string) {
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

const EMPRESAS = [
  { id: 1, nombreComercial: 'QA2 Emprendedor', slug: 'qa2.emprendedor', estadoEmpresa: 'ACTIVO' },
  { id: 2, nombreComercial: 'Moda Urbana', slug: 'maria.moda', estadoEmpresa: 'PENDIENTE_APROBACION' },
]

async function entrarDashboard(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/admin/dashboard') && !url.includes('/kpis')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { stockBajo: 4, totalProductos: 1240, totalUsuarios: 63, totalVentas: 8_450_000, categorias: [] },
        }),
      })
      return
    }
    if (url.includes('/admin/empresas') && !url.includes('/admin/empresas/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: EMPRESAS }),
      })
      return
    }
    if (url.includes('/admin/usuarios')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 9, nombre: 'Carlos', correo: 'c@test.com', roles: [{ nombreRol: 'EMPRENDEDOR' }] }],
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
  await page.addInitScript(({ auth, tourKey }) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem(tourKey, '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.removeItem('hc-sidebar-collapsed')
  }, { auth: payloadAuth('ADMIN'), tourKey: 'hc-admin-tour-v4-done' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
}

test.describe('Admin IT — Panel Admin Figma', () => {
  test('muestra KPIs de plataforma, carga masiva y tiendas recientes', async ({ page }) => {
    await entrarDashboard(page)

    await expect(page.getByRole('heading', { name: 'Panel Admin' })).toBeVisible()
    await expect(page.getByText('Vista general de HotClick')).toBeVisible()
    await expect(page.getByText('Tiendas activas')).toBeVisible()
    await expect(page.getByText('Vendedores')).toBeVisible()
    await expect(page.getByText('Productos publicados')).toBeVisible()
    await expect(page.getByText('Ventas totales')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Carga masiva de productos' })).toBeVisible()
    await expect(page.locator('[data-mm="mas-herramientas"]')).toBeVisible()
    await expect(page.getByText('QA2 Emprendedor')).toBeVisible()
    await expect(page.getByText('Activa', { exact: true })).toBeVisible()
    await expect(page.locator('.hc-superadmin-theme')).toBeAttached()

    await page.getByRole('link', { name: 'Carga masiva de productos' }).click()
    await expect(page).toHaveURL(/\/admin\/productos\/carga-masiva/)
  })

  test('dashboard usa tarjetas claras', async ({ page }) => {
    await entrarDashboard(page)
    await expect(page.getByText('Tiendas activas')).toBeVisible()
    const kpi = page.getByText('Tiendas activas').locator('xpath=ancestor::div[contains(@class,"rounded")][1]')
    const bg = await kpi.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgb(17, 17, 20)')
  })
})
