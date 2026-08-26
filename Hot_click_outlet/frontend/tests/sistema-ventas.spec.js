import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

async function sesionDueñoSinPosEnPlan(page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            planNombre: 'FREE',
            features: { pos: false, crm: false, compras: false, reportes: false, ai: false, api: false },
          },
        }),
      })
      return
    }
    if (path.includes('/pos/caja/activo')) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Sin turno' }),
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

test.describe('Sistema — ventas de mostrador', () => {
  test('aunque el plan no liste pos, el dueño ve Ventas y puede abrir caja', async ({ page }) => {
    await sesionDueñoSinPosEnPlan(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/pedidos', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Ventas y pedidos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ventas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pedidos' })).toBeVisible()
    await expect(page.getByRole('button', { name: /creá un pedido/i })).toBeVisible()

    await page.getByRole('button', { name: 'Ventas' }).click()
    const registrar = page.getByRole('link', { name: /registrá una venta/i })
    await expect(registrar).toHaveAttribute('href', '/admin/pos')
    await registrar.click()
    await expect(page).toHaveURL(/\/admin\/pos/)
    await expect(page.getByRole('heading', { name: /abrí el turno/i })).toBeVisible()
  })
})

test('Ventas y pedidos de Sistema no consulta el feature pos del plan', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const pagina = readFileSync(join(raiz, '../src/pages/admin/SistemaVentasPedidos.jsx'), 'utf8')
  expect(pagina).not.toContain('hasFeature')
  expect(pagina).not.toContain('usePlan')
  expect(pagina).toContain("to=\"/admin/pos\"")
  expect(pagina).toContain('Creá un pedido')
})
