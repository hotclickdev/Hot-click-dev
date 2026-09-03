/**
 * Auth + API mocks compartidos por seller-wizard*.spec.ts
 */
import { expect, type Page, type Route } from '@playwright/test'

export type PlanVendedor = 'PYME' | 'NEGOCIO_PLUS'

export function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

export function payloadAuth() {
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

export function prefijoPorPlan(plan: PlanVendedor) {
  return plan === 'NEGOCIO_PLUS' ? '/negocio-plus' : '/pyme'
}

/** Assert wizard step label + heading after goto (shared cobro/negocio/perfil). */
export async function expectPaso(
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

export async function entrarSeller(
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
