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

function sidebarVisible(page: Page) {
  return page.locator('aside.hc-admin-sidebar').filter({ visible: true })
}

test.describe('Admin IT — nav por jobs', () => {
  test('ADMIN agrupa por job; IA y Fiscal arrancan colapsados', async ({ page }) => {
    await entrarPanel(page, 'ADMIN')
    const sidebar = sidebarVisible(page)

    await expect(sidebar.getByText('Admin', { exact: true }).first()).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Inicio' }).locator('svg')).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Tiendas' }).locator('svg')).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Usuarios' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Moderación' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Config' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Más herramientas' })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /abastecimiento/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /plataforma/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /finanzas/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /^ia$/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /fiscal/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /^sistema$/i })).toHaveCount(0)

    await expect(sidebar.getByRole('link', { name: 'Compras' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'AI Copilot' })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Comprobantes Electrónicos' })).toHaveCount(0)

    const fondoSidebar = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fondoSidebar).not.toBe('rgb(20, 23, 28)')
    const primary = await page.locator('.hc-superadmin-theme').evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--hc-primary').trim(),
    )
    expect(primary.toLowerCase()).toBe('#e31e24')

    await sidebar.getByRole('button', { name: /^ia$/i }).click()
    await expect(sidebar.getByRole('link', { name: 'AI Copilot' })).toBeVisible()

    await sidebar.getByRole('button', { name: /fiscal/i }).click()
    await expect(sidebar.getByRole('link', { name: 'Comprobantes Electrónicos' })).toBeVisible()
  })

  test('POS chrome es claro, sin terminal n-900', async ({ page }) => {
    await entrarPanel(page, 'ADMIN')
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('POS', { exact: true })).toBeVisible()
    const fondo = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fondo).not.toBe('rgb(8, 8, 12)')
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

    await expect(page).toHaveURL(/\/admin\/ayuda/)
    const nav = page.getByRole('navigation', { name: 'Navegación sistema' })
    await expect(nav.getByRole('link', { name: 'Inicio' }).locator('svg')).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Vender' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Catálogo' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Mi negocio' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Más' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('aria-current', 'page')
  })
})
