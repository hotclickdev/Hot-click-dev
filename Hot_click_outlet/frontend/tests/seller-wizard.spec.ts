/**
 * Smoke checklist PYME + Negocio Plus (local Playwright):
 * - Ambos: /productos/nuevo (Paso 1/5), /bodegas/nueva, /plan (1/3),
 *   /cobro/nuevo, /negocio, /perfil
 * - Solo PYME: /pyme/equipo → Invitar miembro (wizard)
 * - Solo Plus: /negocio-plus/sucursales → Agregar sucursal (Paso 1/3)
 * Run: pnpm exec playwright test tests/seller-wizard.spec.ts
 */
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

/** Assert wizard step label + heading after goto (shared cobro/negocio/perfil). */
async function expectPaso(
  page: Page,
  path: string,
  progreso: string,
  heading: string | RegExp,
  timeout = 15_000,
) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(progreso)).toBeVisible({ timeout })
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout })
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
    if (path.includes('/empresa/perfil')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 1,
            nombreComercial: 'Demo',
            nombreEmpresa: 'Demo',
            numeroWhatsapp: '88880000',
            descripcion: '',
          },
        }),
      })
      return
    }
    if (path.includes('/empresa/equipo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    if (path.includes('/sucursales')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
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
    await expectPaso(page, '/pyme/productos/nuevo', 'Paso 1 de 5', 'Tipo de producto')
  })

  test('nueva bodega: ve progreso Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 3', 'Nombre de la bodega')
  })

  test('comparar planes: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME', { billingPlanes: true })
    await expectPaso(page, '/pyme/plan', 'Paso 1 de 3', 'Elegí tu plan', 20_000)
    await expect(page.getByRole('button', { name: 'Mejorar a Negocio Plus' })).toBeVisible()
  })

  test('cobro/nuevo: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/cobro/nuevo', 'Paso 1 de 3', 'Tipo de cuenta')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('negocio: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/negocio', 'Paso 1 de 3', 'Identidad del negocio', 20_000)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('perfil: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/perfil', 'Paso 1 de 3', 'Tu nombre', 20_000)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('equipo: invite form wizard Paso 1 de 4', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/pyme/equipo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mi Equipo' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '+ Invitar miembro' }).click()
    await expect(page.getByText('Paso 1 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: '¿Cómo se llama?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('PlanPathGate redirige /emprendedor → /pyme según tenant', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/emprendedor/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pyme\/productos\/nuevo/)
    await expect(page.getByText('Paso 1 de 5')).toBeVisible()
  })
})

test.describe('Wizard conversacional Negocio Plus', () => {
  test('agregar producto: ve Paso 1 de 5', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/productos/nuevo`, 'Paso 1 de 5', 'Tipo de producto')
  })

  test('nueva bodega: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/bodegas/nueva`, 'Paso 1 de 3', 'Nombre de la bodega')
  })

  test('comparar planes: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS', { billingPlanes: true })
    await expectPaso(page, `${base}/plan`, 'Paso 1 de 3', 'Elegí tu plan', 20_000)
  })

  test('cobro/nuevo: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/cobro/nuevo`, 'Paso 1 de 3', 'Tipo de cuenta')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('negocio: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/negocio`, 'Paso 1 de 3', 'Identidad del negocio', 20_000)
  })

  test('perfil: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/perfil`, 'Paso 1 de 3', 'Tu nombre', 20_000)
  })

  test('sucursales: create wizard Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await page.goto('/negocio-plus/sucursales', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mis Sucursales' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '+ Agregar sucursal' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Paso 1 de 3')).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Nombre de la sucursal' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })
})
