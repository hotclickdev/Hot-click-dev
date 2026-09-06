import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

/** Preferencia persistida (zustand) — el html efectivo depende de la ruta. */
const UI_DARK = {
  state: {
    theme: 'dark',
    language: 'es',
    fontSize: 'normal',
    highContrast: false,
    reduceMotion: false,
    colorFilter: 'none',
  },
  version: 0,
}

function payloadAuthEmprendedor() {
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

async function mockApi(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function seedUiYConsent(page: Page, conAuthPanel: boolean) {
  await page.addInitScript(
    ({ ui, auth, conAuth }) => {
      localStorage.setItem('hotclick-ui', JSON.stringify(ui))
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
        analytics: false,
        functional: true,
        timestamp: Date.now(),
      }))
      localStorage.setItem('hc-promo-seen', String(Date.now()))
      if (conAuth) {
        localStorage.setItem('hotclick-auth', JSON.stringify(auth))
        localStorage.setItem('hc-admin-tour-v4-done', '1')
        localStorage.setItem('hc-mm-v1-off', '1')
        localStorage.setItem('hc-mm-v1-welcome-done', '1')
      }
    },
    { ui: UI_DARK, auth: payloadAuthEmprendedor(), conAuth: conAuthPanel },
  )
}

async function expectHtmlTema(page: Page, tema: 'light' | 'dark') {
  const html = page.locator('html')
  await expect(html).toHaveClass(new RegExp(`\\b${tema}\\b`))
  await expect(html).not.toHaveClass(new RegExp(`\\b${tema === 'light' ? 'dark' : 'light'}\\b`))
}

test.describe('Tema por ruta (lock marketplace)', () => {
  test('preferencia dark: público fuerza light; panel aplica dark', async ({ page }) => {
    await mockApi(page)
    await seedUiYConsent(page, true)
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expectHtmlTema(page, 'light')

    const preferencia = await page.evaluate(() => {
      const raw = localStorage.getItem('hotclick-ui')
      return raw ? (JSON.parse(raw) as { state?: { theme?: string } }).state?.theme : null
    })
    expect(preferencia).toBe('dark')

    await page.goto('/emprendedor', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('navigation', { name: 'Navegación emprendedor' })).toBeVisible()
    await expectHtmlTema(page, 'dark')

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expectHtmlTema(page, 'light')
  })
})
