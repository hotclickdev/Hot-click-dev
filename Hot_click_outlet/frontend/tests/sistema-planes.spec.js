import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

async function sesionDueñoPlanGratis(page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            planNombre: 'EMPRENDEDOR',
            features: { pos: false, crm: false, compras: false, reportes: false, ai: false, api: false },
          },
        }),
      })
      return
    }
    if (path.includes('/billing/planes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            nombre: 'EMPRENDEDOR',
            descripcion: 'Gratis',
            precioUsd: 0,
            maxProductos: 20,
            maxUsuarios: 1,
            tienePos: false,
            tieneCompras: false,
            tieneReportes: false,
            tieneAi: false,
            tieneApi: false,
          },
        ]),
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
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'dueno@hotclick.test',
      userRole: 'EMPRENDEDOR',
      userName: 'Dueño',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  })
}

test.describe('Sistema — planes y caja', () => {
  test('aunque el API marque tienePos false, el plan gratis incluye la caja', async ({ page }) => {
    await sesionDueñoPlanGratis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/billing/planes', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Planes y precios' })).toBeVisible()

    const filaPos = page.locator('div.flex.items-center').filter({ hasText: 'POS / Caja registradora' })
    await expect(filaPos).toHaveCount(1)
    await expect(filaPos.locator('path').first()).toHaveAttribute('d', /M5 13/)

    const filaCompras = page.locator('div.flex.items-center').filter({ hasText: 'Módulo de compras' })
    await expect(filaCompras.locator('path').first()).toHaveAttribute('d', /M6 18/)
  })
})

test('la ficha de planes no usa tienePos para pintar la caja', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const pagina = readFileSync(join(raiz, '../src/pages/admin/AdminPlanes.jsx'), 'utf8')
  expect(pagina).not.toContain('plan.tienePos')
  expect(pagina).toContain('POS / Caja registradora')
})
