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

async function entrarPanel(page, rol) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(({ auth, tourKey }) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem(tourKey, '1')
    localStorage.removeItem('hc-sidebar-collapsed')
  }, { auth: payloadAuth(rol), tourKey: 'hc-admin-tour-v4-done' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
}

function sidebarVisible(page) {
  return page.locator('aside.hc-admin-sidebar').filter({ visible: true })
}

test.describe('Admin IT — nav por jobs', () => {
  test('ADMIN agrupa por job; IA y Fiscal arrancan colapsados', async ({ page }) => {
    await entrarPanel(page, 'ADMIN')
    const sidebar = sidebarVisible(page)

    await expect(sidebar.getByText('IT Admin')).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /abastecimiento/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /plataforma/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /finanzas/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /^ia$/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /fiscal/i })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: /^sistema$/i })).toHaveCount(0)

    await expect(sidebar.getByRole('link', { name: 'Compras' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'AI Copilot' })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Comprobantes Electrónicos' })).toHaveCount(0)

    await sidebar.getByRole('button', { name: /^ia$/i }).click()
    await expect(sidebar.getByRole('link', { name: 'AI Copilot' })).toBeVisible()

    await sidebar.getByRole('button', { name: /fiscal/i }).click()
    await expect(sidebar.getByRole('link', { name: 'Comprobantes Electrónicos' })).toBeVisible()
  })

  test('EMPRENDEDOR sigue en Sistema, no en el menú IT', async ({ page }) => {
    await entrarPanel(page, 'EMPRENDEDOR')
    const sidebar = sidebarVisible(page)

    await expect(sidebar.getByText('Sistema', { exact: true })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Ventas y pedidos' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Consultas con Hot' })).toBeVisible()
    await expect(sidebar.getByText('IT Admin')).toHaveCount(0)
    await expect(sidebar.getByRole('button', { name: /abastecimiento/i })).toHaveCount(0)
    await expect(sidebar.getByRole('button', { name: /plataforma/i })).toHaveCount(0)
  })
})
