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
      userEmail: 'emprendedor@hotclick.test',
      userRole: 'EMPRENDEDOR',
      userName: 'Emprendedor',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  }
}

async function entrarEmprendedor(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
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
  await page.goto('/emprendedor', { waitUntil: 'domcontentloaded' })
}

function sidebar(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación emprendedor' })
}

test.describe('Sidebar emprendedor', () => {
  test('agrupa Operar, Inventario y Negocio; Inicio queda como página actual', async ({ page }) => {
    await entrarEmprendedor(page)
    const nav = sidebar(page)

    await expect(nav.getByRole('group', { name: 'Operar' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Inventario' })).toBeVisible()
    await expect(nav.getByRole('group', { name: 'Negocio' })).toBeVisible()

    await expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Caja (POS)' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Mis Bodegas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Mis Productos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Datos de tu Negocio' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Métodos de Cobro' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Tu Plan' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Notificaciones' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Ayuda y Soporte' })).toBeVisible()
  })

  test('al ir a Pedidos, ese ítem queda como página actual', async ({ page }) => {
    await entrarEmprendedor(page)
    const nav = sidebar(page)

    await nav.getByRole('link', { name: 'Pedidos' }).click()
    await expect(page).toHaveURL(/\/emprendedor\/pedidos/)
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('alterna modo oscuro desde el sidebar', async ({ page }) => {
    await entrarEmprendedor(page)
    const shell = page.locator('.hc-seller-theme')
    const toggle = page.locator('aside').filter({ visible: true }).getByRole('button', { name: 'Cambiar tema' })
    await expect(toggle).toBeVisible()

    const bgClaro = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--hc-bg').trim())
    expect(bgClaro.toUpperCase()).not.toBe('#0E1116')

    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    const bgOscuro = await shell.evaluate((el) => getComputedStyle(el).getPropertyValue('--hc-bg').trim())
    expect(bgOscuro.toUpperCase()).toBe('#0E1116')
  })
})
