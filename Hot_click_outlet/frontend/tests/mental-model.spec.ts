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
  test('primera visita a /admin muestra overlay; Omitir deja clic en Carga masiva; segunda visita no muestra', async ({ page }) => {
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

    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: 'Omitir por ahora' }).click()
    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toHaveCount(0)

    const carga = page.getByRole('link', { name: 'Carga masiva de productos' })
    await expect(carga).toBeVisible()
    await carga.click()
    await expect(page).toHaveURL(/\/admin\/productos\/carga-masiva/)

    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Panel Admin' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Omitir' })).toHaveCount(0)
  })

  test('Hacer el tour abre spotlight sobre Carga masiva', async ({ page }) => {
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

    await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: 'Hacer el tour' }).click()
    await expect(page.locator('#mm-titulo')).toHaveText('Carga masiva')
    await expect(page.getByText(/subís muchos productos/i)).toBeVisible()
    await page.getByRole('button', { name: 'Omitir' }).click()
    await expect(page.getByRole('link', { name: 'Carga masiva de productos' })).toBeVisible()
  })
})
