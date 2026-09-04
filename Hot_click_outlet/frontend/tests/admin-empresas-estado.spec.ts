import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth() {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'ADMIN' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'admin@hotclick.test',
      userRole: 'ADMIN',
      userName: 'Admin',
      empresaId: 1,
      empresaSlug: 'hotclick',
      empresaNombre: 'HOTCLICK',
      permissions: [],
      roles: ['ADMIN'],
    },
    version: 0,
  }
}

const TIENDA = {
  id: 22,
  nombreComercial: 'QA Emprendedor Test 2',
  slug: 'qa2-emprendedor-test',
  plan: 'EMPRENDEDOR',
  estadoEmpresa: 'INACTIVO',
  visibilidadPublica: true,
  totalProductos: 1,
  totalPedidos: 0,
  totalUsuarios: 1,
}

const PRODUCTO_PAUSADO = {
  id: 901,
  nombre: 'Caja personalizada',
  precio: 1500,
  stock: 12,
  visibleCatalogo: false,
  categoria: 'arretes',
}

async function mockAdminApi(page: Page, estado: { empresa: string; visibleCatalogo: boolean }) {
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    if (method === 'PATCH' && url.includes('/visibilidad-catalogo')) {
      const body = req.postDataJSON() as { visibleCatalogo?: boolean }
      estado.visibleCatalogo = body.visibleCatalogo === true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: estado.visibleCatalogo ? 'Producto publicado' : 'Producto pausado',
          data: { ...PRODUCTO_PAUSADO, visibleCatalogo: estado.visibleCatalogo },
        }),
      })
      return
    }

    if (method === 'PUT' && url.includes('/admin/empresas/22/estado')) {
      const body = req.postDataJSON() as { estadoEmpresa?: string }
      estado.empresa = body.estadoEmpresa ?? estado.empresa
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Estado actualizado', data: null }),
      })
      return
    }

    if (url.includes('/admin/empresas/22/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ ...PRODUCTO_PAUSADO, visibleCatalogo: estado.visibleCatalogo }],
        }),
      })
      return
    }

    if (url.includes('/admin/empresas/22') && !url.includes('/admin/empresas/22/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...TIENDA, estadoEmpresa: estado.empresa },
        }),
      })
      return
    }

    if (url.includes('/admin/empresas') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ ...TIENDA, estadoEmpresa: estado.empresa }],
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

async function entrarEmpresas(page: Page, estado: { empresa: string; visibleCatalogo: boolean }) {
  await mockAdminApi(page, estado)
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
  }, payloadAuth())
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/empresas', { waitUntil: 'domcontentloaded' })
}

test.describe('Admin IT — estado de tienda y producto', () => {
  test('activa la tienda INACTIVA desde el encabezado del negocio', async ({ page }) => {
    const estado = { empresa: 'INACTIVO', visibleCatalogo: false }
    await entrarEmpresas(page, estado)

    await expect(page.getByRole('heading', { name: 'Tiendas' })).toBeVisible()
    await page.getByRole('link', { name: /QA Emprendedor Test 2/ }).click()
    await expect(page).toHaveURL(/\/admin\/empresas\/22/)

    const activar = page.getByRole('button', { name: 'ACTIVO', exact: true }).first()
    await expect(activar).toBeEnabled()
    const putEstado = page.waitForRequest((req) =>
      req.method() === 'PUT' && req.url().includes('/admin/empresas/22/estado'))
    await activar.click()
    const req = await putEstado
    expect(req.postDataJSON()).toEqual({ estadoEmpresa: 'ACTIVO' })
    await expect(page.getByText('Estado actualizado a ACTIVO')).toBeVisible()
  })

  test('Publicar en Productos llama visibilidad-catalogo y muestra Publicado', async ({ page }) => {
    const estado = { empresa: 'INACTIVO', visibleCatalogo: false }
    await entrarEmpresas(page, estado)

    await page.getByRole('link', { name: /QA Emprendedor Test 2/ }).click()
    await expect(page).toHaveURL(/\/admin\/empresas\/22/)
    await page.getByRole('button', { name: /Productos/ }).click()

    await expect(page.getByText('Caja personalizada')).toBeVisible()
    await expect(page.getByText('Pausado')).toBeVisible()

    const patchVis = page.waitForRequest((req) =>
      req.method() === 'PATCH' && req.url().includes('/visibilidad-catalogo'))
    await page.getByRole('button', { name: 'Publicar' }).click()
    const req = await patchVis
    expect(req.postDataJSON()).toEqual({ visibleCatalogo: true })
    await expect(page.getByText('Producto publicado de nuevo')).toBeVisible()
    await expect(page.getByText('Publicado', { exact: true })).toBeVisible()
  })

  test('Carga masiva lleva el negocio destino en la URL', async ({ page }) => {
    const estado = { empresa: 'INACTIVO', visibleCatalogo: false }
    await entrarEmpresas(page, estado)

    await page.getByRole('link', { name: /QA Emprendedor Test 2/ }).click()
    const carga = page.getByRole('link', { name: 'Carga masiva' })
    await expect(carga).toHaveAttribute('href', '/admin/productos/carga-masiva?empresaId=22')
    await expect(page.getByRole('link', { name: 'Importar CSV' })).toHaveAttribute(
      'href',
      '/admin/productos/importar?empresaId=22',
    )
    await carga.click()
    await expect(page).toHaveURL(/\/admin\/productos\/carga-masiva\?empresaId=22/)
    await expect(page.getByLabel('Negocio destino')).toHaveValue('22')
  })
})
