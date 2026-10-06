import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function auth(rol: string) {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol }),
      refreshToken: null,
      userId: 1,
      userEmail: `${rol.toLowerCase()}@hotclick.test`,
      userRole: rol,
      userName: rol,
      empresaId: rol === 'ADMIN' ? null : 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: [rol],
    },
    version: 0,
  }
}

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/admin/moderacion/resumen')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { empresas: 1, ofertas: 0, recolecciones: 0, sinpe: 2, testimonios: 0, payouts: 0, reportesProducto: 0, cuentasCobro: 0, total: 3 },
        }),
      })
      return
    }
    if (url.includes('/admin/empresas/') && route.request().method() === 'PUT') {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Motivo obligatorio' }) })
      return
    }
    if (/\/admin\/empresas\/\d+/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 7, nombreComercial: 'Taller Sol', slug: 'taller-sol', estadoEmpresa: 'ACTIVO', plan: 'PYME', visibilidadPublica: true },
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
          data: [{ id: 7, nombreComercial: 'Taller Sol', slug: 'taller-sol', estadoEmpresa: 'ACTIVO', plan: 'PYME', visibilidadPublica: true }],
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
}

test.describe('Consola de plataforma', () => {
  test('el operador ve los ocho dominios y una cola', async ({ page }) => {
    await mockApi(page)
    await page.addInitScript((sesion) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(sesion))
      localStorage.setItem('hc-mm-v1-off', '1')
      localStorage.setItem('hc-admin-tour-v4-done', '1')
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
        analytics: false,
        advertising: false,
        functional: true,
        timestamp: Date.now(),
      }))
    }, auth('ADMIN'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/plataforma', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Estadísticas' })).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Dominios de HotClick' })
    for (const nombre of ['Estadísticas', 'Tiendas', 'Revisar', 'Dinero', 'Campo', 'Acceso', 'IA', 'Reglas']) {
      await expect(nav.getByRole('link', { name: nombre })).toBeVisible()
    }
    await expect(page.getByText('Visitas').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Altas' })).toHaveCount(0)
    await expect(page.getByText('Tiendas activas')).toHaveCount(0)

    await nav.getByRole('link', { name: 'Tiendas', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Taller Sol' })).toBeVisible()
    await page.getByRole('link', { name: 'Taller Sol' }).click()
    await expect(page.getByRole('heading', { name: 'Taller Sol' })).toBeVisible()
    await page.getByRole('button', { name: 'Suspender' }).click()
    await expect(page.getByText('Escribí el motivo antes de suspender o inactivar.')).toBeVisible()
  })

  test('el vendedor no entra a la consola', async ({ page }) => {
    await mockApi(page)
    await page.addInitScript((sesion) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(sesion))
      localStorage.setItem('hc-mm-v1-off', '1')
    }, auth('EMPRENDEDOR'))
    await page.goto('/plataforma', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/emprendedor/)
    await expect(page.getByRole('navigation', { name: 'Dominios de HotClick' })).toHaveCount(0)
  })
})
