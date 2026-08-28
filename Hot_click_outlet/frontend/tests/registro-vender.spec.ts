import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth({ rol, empresaId = null }: { rol: string; empresaId?: number | null }) {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol }),
      refreshToken: null,
      userId: 1,
      userEmail: `${rol.toLowerCase()}@hotclick.test`,
      userRole: rol,
      userName: rol,
      empresaId,
      empresaSlug: empresaId ? 'demo' : null,
      empresaNombre: empresaId ? 'Demo' : null,
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

async function sesion(page: Page, auth: ReturnType<typeof payloadAuth>) {
  await mockApi(page)
  await page.addInitScript((payload: ReturnType<typeof payloadAuth>) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(payload))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
  }, auth)
}

test.describe('Puerta Vender — una entrada, tres rutas', () => {
  test('anónimo en /registro-empresa ve el alta; login vuelve a registrar-negocio', async ({ page }) => {
    await page.goto('/registro-empresa', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Registrá tu empresa' })).toBeVisible()
    await expect(page.getByText(/si ya comprás en hotclick/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      /\/login\?redirect=%2Fregistrar-negocio/,
    )
  })

  test('/registro?intencion=vender llega a registro-empresa', async ({ page }) => {
    await page.goto('/registro?intencion=vender', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/registro-empresa$/)
    await expect(page.getByRole('heading', { name: 'Registrá tu empresa' })).toBeVisible()
  })

  test('anónimo en /registrar-negocio va a login con retorno', async ({ page }) => {
    await page.goto('/registrar-negocio', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?redirect=%2Fregistrar-negocio/)
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible()
  })

  test('comprador logueado en /registro-empresa pasa a registrar-negocio', async ({ page }) => {
    await sesion(page, payloadAuth({ rol: 'USUARIO_FINAL' }))
    await page.goto('/registro-empresa', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/registrar-negocio$/)
    await expect(page.getByText(/empezá a vender/i)).toBeVisible()
  })

  test('vendedor logueado en /registro-empresa va al panel', async ({ page }) => {
    await sesion(page, payloadAuth({ rol: 'EMPRENDEDOR', empresaId: 1 }))
    await page.goto('/registro-empresa', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('/registro y /registrar-negocio siguen existiendo', async ({ page }) => {
    await page.goto('/registro', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /quiero vender/i })).toBeVisible()
    await sesion(page, payloadAuth({ rol: 'USUARIO_FINAL' }))
    await page.goto('/registrar-negocio', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/registrar-negocio$/)
  })
})
