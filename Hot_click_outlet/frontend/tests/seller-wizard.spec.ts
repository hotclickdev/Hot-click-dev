import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

type PlanVendedor = 'PYME' | 'NEGOCIO_PLUS'

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
      userEmail: 'pyme@hotclick.test',
      userRole: 'EMPRENDEDOR',
      userName: 'Vendedor PYME',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  }
}

function prefijoPorPlan(plan: PlanVendedor) {
  return plan === 'NEGOCIO_PLUS' ? '/negocio-plus' : '/pyme'
}

async function entrarSeller(
  page: Page,
  planNombre: PlanVendedor,
  opts: { billingPlanes?: boolean; categorias?: boolean } = {},
) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { planNombre, features: {} } }),
      })
      return
    }
    if (opts.categorias && path.includes('/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 1, nombreCategoria: 'Ropa' }, { id: 2, nombreCategoria: 'Tech' }],
        }),
      })
      return
    }
    if (opts.billingPlanes && path.includes('/billing/planes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, nombre: 'EMPRENDEDOR', precioMensual: 0 },
            { id: 2, nombre: 'PYME', precioMensual: 9900 },
            { id: 3, nombre: 'NEGOCIO_PLUS', precioMensual: 24900 },
          ],
        }),
      })
      return
    }
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
  await page.setViewportSize({ width: 390, height: 844 })
}

test.describe('Wizard conversacional PYME', () => {
  test('agregar producto: ve Paso 1 de 5', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/pyme/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tipo de producto' })).toBeVisible()
  })

  test('nueva bodega: ve progreso Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/pyme/bodegas/nueva', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre de la bodega' })).toBeVisible()
  })

  test('comparar planes: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME', { billingPlanes: true })
    await page.goto('/pyme/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Elegí tu plan' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mejorar a Negocio Plus' })).toBeVisible()
  })

  test('PlanPathGate redirige /emprendedor → /pyme según tenant', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/emprendedor/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pyme\/productos\/nuevo/)
    await expect(page.getByText('Paso 1 de 5')).toBeVisible()
  })
})

test.describe('Wizard conversacional Negocio Plus', () => {
  test('rutas planas con prefijo correcto', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS', { billingPlanes: true })

    await page.goto(`${base}/productos/nuevo`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 5')).toBeVisible()

    await page.goto(`${base}/bodegas/nueva`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()

    await page.goto(`${base}/plan`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Elegí tu plan' })).toBeVisible()
  })
})
