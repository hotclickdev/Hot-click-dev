import { test, expect, type Page, type Route } from '@playwright/test'
import { jwtSinFirmar, payloadAuth, prefijoPorPlan, type PlanVendedor } from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function entrar(page: Page, plan: PlanVendedor, hechos: { bodegas?: number; productos?: number }) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { planNombre: plan, features: {} } }),
      })
      return
    }
    if (path.includes('/bodegas/ubicacion-despacho')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { tieneUbicacion: false, obligatoria: true } }),
      })
      return
    }
    if (path.includes('/bodegas')) {
      const lista = hechos.bodegas
        ? [{ id: 1, nombreBodega: 'Central', direccionExacta: 'Escazú' }]
        : []
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: lista }),
      })
      return
    }
    if (path.includes('/productos')) {
      const lista = hechos.productos ? [{ id: 1, nombreProducto: 'Taza', precioVenta: 1000 }] : []
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: lista }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  const auth = payloadAuth()
  auth.state.userRole = 'EMPRENDEDOR'
  await page.addInitScript((guardado) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(guardado))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false, functional: true, timestamp: Date.now(),
    }))
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-seller-done', '1')
  }, auth)
}

for (const plan of ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const) {
  test(`${plan} muestra la guía y bloquea productos sin bodega`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await entrar(page, plan, {})
    await page.goto(prefijoPorPlan(plan), { waitUntil: 'domcontentloaded' })
    const guia = page.getByTestId('tour-checklist').filter({ visible: true })
    await expect(guia).toBeVisible()
    await expect(guia.getByText('Creá una bodega')).toBeVisible()
    const productos = plan === 'EMPRENDEDOR'
      ? '/emprendedor/productos'
      : `${prefijoPorPlan(plan)}/productos`
    await page.goto(productos, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('tour-bloqueo-producto')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear mi bodega primero' })).toBeVisible()
  })
}

test('con bodega el producto deja de estar bloqueado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await entrar(page, 'PYME', { bodegas: 1 })
  await page.goto('/pyme/productos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('tour-bloqueo-producto')).toHaveCount(0)
  await expect(page.getByTestId('tour-coachmark')).toBeVisible()
  await expect(page.getByText('Creá un producto')).toBeVisible()
})

test('el admin prepara el enlace y otra persona lo acepta', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    if (path.endsWith('/admin/empresas/9/invitacion-propietario') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { url: 'https://hotclick.lat/invitacion/tok-demo', estado: 'PENDIENTE', expiraEn: '2026-10-11T12:00:00' },
        }),
      })
      return
    }
    if (path.endsWith('/admin/empresas/9/invitacion-propietario') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { estado: 'NINGUNA' } }),
      })
      return
    }
    if (path.includes('/admin/empresas/9')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 9, nombreEmpresa: 'Luna', nombreComercial: 'Luna', slug: 'luna', plan: 'PYME', estadoEmpresa: 'PENDIENTE_APROBACION' },
        }),
      })
      return
    }
    if (path.includes('/public/invitaciones/tok-demo') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { nombreComercial: 'Luna', plan: 'PYME' } }),
      })
      return
    }
    if (path.includes('/public/invitaciones/tok-demo/aceptar')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR', empresaId: 9 }),
            id: 20,
            correo: 'ana@hotclick.test',
            rol: 'EMPRENDEDOR',
            nombre: 'Ana',
            empresaId: 9,
            empresaSlug: 'luna',
            empresaNombre: 'Luna',
            plan: 'PYME',
            otpEnviado: true,
          },
        }),
      })
      return
    }
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { planNombre: 'PYME', features: {} } }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  const admin = payloadAuth()
  const sesion = admin.state as { userRole: string; roles: string[]; empresaId: number | null }
  sesion.userRole = 'ADMIN'
  sesion.roles = ['ADMIN']
  sesion.empresaId = null
  await page.addInitScript((guardado) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(guardado))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false, functional: true, timestamp: Date.now(),
    }))
    localStorage.setItem('hc-mm-v1-off', '1')
  }, admin)
  await page.goto('/admin/empresas/9', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('asignar-propietario')).toBeVisible()
  await page.getByRole('button', { name: 'Crear enlace' }).click()
  await expect(page.getByTestId('url-invitacion')).toContainText('/invitacion/tok-demo')

  await page.goto('/invitacion/tok-demo', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Luna' })).toBeVisible()
  await page.getByLabel('Nombre').fill('Ana')
  await page.getByLabel('Correo').fill('ana@hotclick.test')
  await page.getByLabel('Contraseña').fill('Clave1234')
  await page.getByRole('button', { name: 'Aceptar el negocio' }).click()
  await expect(page.getByText('Ya sos propietario de Luna')).toBeVisible()
  await page.getByRole('button', { name: 'Entrar a mi negocio' }).click()
  await expect(page.getByTestId('tour-checklist').filter({ visible: true })).toBeVisible()
})
