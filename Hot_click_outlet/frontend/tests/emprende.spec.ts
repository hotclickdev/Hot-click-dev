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

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function silenciarOverlays(page: Page) {
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
  test('visitante ve la landing Figma del plan Emprendedor, sin montos ni cupos', async ({ page }) => {
    await mockApi(page)
    await silenciarOverlays(page)
    await page.goto('/emprende', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('landing-emprendedor')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Plan Emprendedor/ })).toBeVisible()
    await expect(page.getByAltText('Interior de un local comercial')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Elegir este plan' }).first()).toHaveAttribute('href', '/registro-empresa?plan=emprendedor')
    const texto = await page.getByTestId('landing-emprendedor').innerText()
    expect(texto).not.toMatch(/₡\s?\d|\d\s?%|cupos? gratis|soporte prioritario|sucursal/i)
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
      '/emprendedor/opciones',
    )
    await expect(page.getByRole('link', { name: /agregar un producto/i })).toHaveAttribute(
      'href',
      '/emprendedor/productos/nuevo',
    )
    await expect(page.getByRole('link', { name: /ver tu plan/i })).toHaveAttribute('href', '/emprendedor/opciones/plan')
    await expect(page.getByRole('link', { name: 'Ir a Sistema' })).toHaveAttribute('href', '/emprendedor')
    await expect(page.getByRole('heading', { name: /más información/i })).toHaveCount(0)
  })
})
