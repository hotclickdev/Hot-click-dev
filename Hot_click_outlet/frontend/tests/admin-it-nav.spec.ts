import { test, expect, type Page, type Route } from '@playwright/test'

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

async function entrarPanel(page: Page, rol: string) {
  await page.route('**/api/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(({ auth, tourKey }: { auth: ReturnType<typeof payloadAuth>; tourKey: string }) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem(tourKey, '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.removeItem('hc-sidebar-collapsed')
  }, { auth: payloadAuth(rol), tourKey: 'hc-admin-tour-v4-done' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
}

function barraDominios(page: Page) {
  return page.getByRole('navigation', { name: 'Dominios de HotClick' })
}

test.describe('Admin IT — nav por jobs', () => {
  test('ADMIN agrupa por job; IA y Fiscal arrancan colapsados', async ({ page }) => {
    await entrarPanel(page, 'ADMIN')
    const sidebar = barraDominios(page)

    await expect(page).toHaveURL(/\/plataforma/)
    for (const nombre of ['Estadísticas', 'Tiendas', 'Revisar', 'Dinero', 'Campo', 'Acceso', 'IA', 'Reglas']) {
      await expect(sidebar.getByRole('link', { name: nombre })).toBeVisible()
    }
    await expect(sidebar.getByRole('link', { name: 'Más herramientas' })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Moderación' })).toHaveCount(0)

    const primary = await page.locator('.hc-superadmin-theme').evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--hc-primary').trim(),
    )
    expect(primary.toLowerCase()).toBe('#e73b33')
  })

  test('ADMIN en /admin/pos no abre la caja', async ({ page }) => {
    await entrarPanel(page, 'ADMIN')
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/plataforma/)
    await expect(page.getByRole('heading', { name: 'Caja (POS)' })).toHaveCount(0)
  })

  test('EMPRENDEDOR en /admin sale a /emprendedor, no al menú IT', async ({ page }) => {
    await entrarPanel(page, 'EMPRENDEDOR')
    await expect(page).toHaveURL(/\/emprendedor\/?$/)
    await expect(page.getByRole('link', { name: 'PRODUCTOS SUBIDOS' })).toBeVisible()
    await expect(page.getByText('IT Admin')).toHaveCount(0)
    await expect(page.getByText('Admin', { exact: true })).toHaveCount(0)
  })

  test('Sistema en /admin/ayuda usa íconos SVG y grupos, no el puntito', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await page.addInitScript(({ auth }: { auth: ReturnType<typeof payloadAuth> }) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(auth))
      localStorage.setItem('hc-admin-tour-v4-done', '1')
      localStorage.setItem('hc-mm-v1-off', '1')
      localStorage.setItem('hc-mm-v1-welcome-done', '1')
    }, { auth: payloadAuth('EMPRENDEDOR') })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/ayuda', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/emprendedor\/opciones\/ayuda/)
    await expect(page.getByRole('link', { name: 'Más herramientas' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Moderación' })).toHaveCount(0)
  })
})
