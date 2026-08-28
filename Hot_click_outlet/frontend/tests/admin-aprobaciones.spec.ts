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

async function entrarAprobaciones(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
  }, payloadAuth())
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/aprobaciones', { waitUntil: 'domcontentloaded' })
}

test.describe('Aprobaciones IT — el gate es el negocio', () => {
  test('la pestaña Productos no enseña revisión ítem por ítem', async ({ page }) => {
    await entrarAprobaciones(page)

    await expect(page.getByRole('heading', { name: 'Solicitudes pendientes' })).toBeVisible()
    await page.getByRole('button', { name: /productos/i }).click()

    await expect(page.getByText(/el catálogo se abre al aprobar el negocio/i)).toBeVisible()
    await expect(page.getByText('Productos nuevos esperando tu aprobación para publicarse en el catálogo')).toHaveCount(0)
    await expect(page.getByText(/no hay revisión producto por producto/i)).toBeVisible()
  })
})
