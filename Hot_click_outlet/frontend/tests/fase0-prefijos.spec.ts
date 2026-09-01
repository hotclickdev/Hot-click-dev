import { test, expect, type Page, type Route } from '@playwright/test'
import {
  destinoPrototipo,
  prefijoPorPlan,
  rutaPanelPorRol,
  rutaSellerDesdeAdmin,
  vendedorSeQuedaEnAdmin,
} from '../src/utils/planPaths.ts'
import { esRutaVisitanteFigma } from '../src/utils/rutaPrototipo.ts'

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

async function mockApi(page: Page, planNombre = 'EMPRENDEDOR') {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { planNombre, features: {} },
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
}

async function sesion(page: Page, rol: string, planNombre = 'EMPRENDEDOR') {
  await mockApi(page, planNombre)
  await page.addInitScript((auth: ReturnType<typeof payloadAuth>) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, payloadAuth(rol))
}

test('prefijos y redirects de Fase 0 son deterministas', () => {
  expect(prefijoPorPlan('EMPRENDEDOR')).toBe('/emprendedor')
  expect(prefijoPorPlan('PYME')).toBe('/pyme')
  expect(prefijoPorPlan('NEGOCIO_PLUS')).toBe('/negocio-plus')
  expect(rutaPanelPorRol('ADMIN')).toBe('/admin')
  expect(rutaPanelPorRol('EMPRENDEDOR', 'PYME')).toBe('/pyme')
  expect(rutaPanelPorRol('CAJERO')).toBe('/admin/pos')
  expect(destinoPrototipo('/prototipo')).toBe('/visitante')
  expect(destinoPrototipo('/prototipo/visitante/shop')).toBe('/visitante/shop')
  expect(destinoPrototipo('/prototipo/emprendedor/productos')).toBe('/emprendedor/productos')
  expect(destinoPrototipo('/prototipo/pyme/equipo')).toBe('/pyme/equipo')
  expect(destinoPrototipo('/prototipo/admin/dashboard')).toBe('/admin/dashboard')
  expect(rutaSellerDesdeAdmin('/admin/productos', '', 'EMPRENDEDOR')).toBe('/emprendedor/productos')
  expect(vendedorSeQuedaEnAdmin('/admin/pos')).toBe(true)
  expect(vendedorSeQuedaEnAdmin('/admin/productos')).toBe(false)
  expect(esRutaVisitanteFigma('/')).toBe(false)
  expect(esRutaVisitanteFigma('/visitante')).toBe(true)
  expect(destinoPrototipo('/prototipo/negocio-plus/equipo')).toBe('/negocio-plus/equipo')
})

test.describe('Fase 0 — URLs por rol', () => {
  test('/prototipo/emprendedor/productos redirige al prefijo real', async ({ page }) => {
    await sesion(page, 'EMPRENDEDOR')
    await page.goto('/prototipo/emprendedor/productos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/emprendedor\/productos/)
  })

  test('EMPRENDEDOR en /admin/productos va a /emprendedor/productos', async ({ page }) => {
    await sesion(page, 'EMPRENDEDOR')
    await page.goto('/admin/productos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/emprendedor\/productos/)
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
  })

  test('ADMIN se queda en /admin, no en /emprendedor', async ({ page }) => {
    await sesion(page, 'ADMIN')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/admin\/?$/)
    await page.goto('/emprendedor', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('PYME en /emprendedor pasa a /pyme', async ({ page }) => {
    await sesion(page, 'EMPRENDEDOR', 'PYME')
    await page.goto('/emprendedor/productos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pyme\/productos/)
  })

  test('POS de EMPRENDEDOR se queda en /admin/pos', async ({ page }) => {
    await sesion(page, 'EMPRENDEDOR')
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/admin\/pos/)
  })

  test('anónimo en Figma vendedor va a login', async ({ page }) => {
    await page.goto('/emprendedor/tienda/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/prototipo/emprendedor/tienda/compra-confirmada', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })
})
