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

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function silenciarOverlays(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

test.describe('Emprende — una puerta, no un laberinto', () => {
  test('pasos 2 y 3 no fingen el alta; solo crear negocio es el link', async ({ page }) => {
    await mockApi(page)
    await silenciarOverlays(page)
    await page.goto('/emprende', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /crecé tu negocio/i })).toBeVisible()
    await expect(page.locator('ol').getByRole('link', { name: /crear mi negocio/i })).toHaveAttribute(
      'href',
      '/registro-empresa',
    )
    await expect(page.getByRole('link', { name: /publicar el primer producto/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /elegir plan/i })).toHaveCount(0)
    await expect(page.getByText('Publicar el primer producto')).toBeVisible()
    await expect(page.getByText('Después del alta, en Sistema. Sin producto no hay venta.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear mi negocio', exact: true })).toHaveAttribute(
      'href',
      '/registro-empresa',
    )
  })

  test('dueño ve destinos reales de Sistema', async ({ page }) => {
    await mockApi(page)
    await silenciarOverlays(page)
    await page.addInitScript((auth) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(auth))
      localStorage.setItem('hc-admin-tour-v4-done', '1')
    }, payloadAuth('EMPRENDEDOR'))
    await page.goto('/emprende', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /seguí creciendo en sistema/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /completar marca/i })).toHaveAttribute(
      'href',
      '/admin/configuracion?seccion=marca',
    )
    await expect(page.getByRole('link', { name: /agregar un producto/i })).toHaveAttribute(
      'href',
      '/admin/productos/nuevo',
    )
    await expect(page.getByRole('link', { name: /ver tu plan/i })).toHaveAttribute('href', '/admin/billing/planes')
    await expect(page.getByRole('link', { name: 'Ir a Sistema' })).toHaveAttribute('href', '/admin')
  })
})
