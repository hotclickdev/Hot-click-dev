import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

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

async function entrarEmprendedor(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/tenant/info')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { planNombre: 'EMPRENDEDOR', features: {} } }),
      })
      return
    }
    if (path.includes('/categorias')) {
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

test.describe('Wizard conversacional Emprendedor', () => {
  test('agregar producto: tipo → foto → identidad con validación', async ({ page }) => {
    await entrarEmprendedor(page)
    await page.goto('/emprendedor/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tipo de producto' })).toBeVisible()

    await page.getByRole('link', { name: /Producto de catálogo/i }).click()
    await expect(page).toHaveURL(/productos\/nuevo\/catalogo/)
    await expect(page.getByText('Paso 2 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Foto del producto' })).toBeVisible()

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Paso 3 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre y categoría' })).toBeVisible()

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Escribí el nombre del producto.')).toBeVisible()

    await page.getByLabel('Nombre del producto').fill('Camiseta test')
    await page.getByRole('button', { name: /Ropa/i }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Paso 4 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Precios' })).toBeVisible()
  })

  test('recolección: pasos zona → pickup', async ({ page }) => {
    await entrarEmprendedor(page)
    await page.goto('/emprendedor/recoleccion', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Zona de servicio' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Paso 2 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dónde pasamos a buscar' })).toBeVisible()
  })

  test('nueva bodega y método de cobro muestran progreso', async ({ page }) => {
    await entrarEmprendedor(page)
    await page.goto('/emprendedor/opciones/bodegas/nueva', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre de la bodega' })).toBeVisible()

    await page.goto('/emprendedor/opciones/cobro/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tipo de cuenta' })).toBeVisible()
    await page.getByRole('radio', { name: /SINPE Móvil/i }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Datos de la cuenta' })).toBeVisible()
  })

  test('datos del negocio: wizard de 3 pasos', async ({ page }) => {
    await entrarEmprendedor(page)
    await page.goto('/emprendedor/opciones/negocio', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Identidad del negocio' })).toBeVisible()
  })

  test('editar producto: carga wizard con foto y progreso', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/tenant/info')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { planNombre: 'EMPRENDEDOR', features: {} } }),
        })
        return
      }
      if (path.includes('/categorias')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [{ id: 1, nombreCategoria: 'Ropa' }] }),
        })
        return
      }
      if (path.includes('/productos')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            content: [{
              id: 42,
              nombre: 'Camiseta Demo',
              precio: 9900,
              precioCompra: 5000,
              descripcion: 'Demo',
              stock: 3,
              visibleCatalogo: true,
              categoriaId: 1,
              categoriaNombre: 'Ropa',
              esPersonalizado: false,
            }],
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
    await page.goto('/emprendedor/productos/42/editar', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 5')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Foto del producto' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Nombre y categoría' })).toBeVisible()
    await expect(page.getByLabel('Nombre del producto')).toHaveValue('Camiseta Demo')
  })

  test('perfil: wizard de 3 pasos', async ({ page }) => {
    await entrarEmprendedor(page)
    await page.goto('/emprendedor/opciones/perfil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Tu nombre' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Tu tienda' })).toBeVisible()
  })

  test('detalle pedido: confirmar envío pide confirmación', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/tenant/info')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { planNombre: 'EMPRENDEDOR', features: {} } }),
        })
        return
      }
      if (path.includes('/pedidos') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 3001,
            nombreCliente: 'Ana Jiménez',
            total: 18500,
            estado: 'PENDIENTE',
            fechaCreacion: '26/08/2026',
            direccionEntrega: 'Heredia, CR',
            items: [{ nombreProducto: 'Auriculares X200', cantidad: 1, precioUnitario: 18500 }],
          }]),
        })
        return
      }
      if (path.includes('/pedidos') && route.request().method() === 'PUT') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
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
    await page.goto('/emprendedor/pedidos/3001', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Confirmar envío' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Confirmar envío' }).click()
    await expect(page.getByText('¿Confirmás que ya enviaste este pedido?')).toBeVisible()
    await expect(page.getByText('Ana Jiménez')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar envío' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar envío' }).click()
    await page.getByRole('button', { name: 'Sí, confirmar envío' }).click()
    await expect(page).toHaveURL(/\/emprendedor\/pedidos$/)
  })

  test('cambiar plan: paso 1 elegir plan con mock API', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/tenant/info')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { planNombre: 'EMPRENDEDOR', features: {} } }),
        })
        return
      }
      if (path.includes('/billing/planes')) {
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
    await page.goto('/emprendedor/opciones/plan', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 1 de 3')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Elegí tu plan' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mejorar a PYME' })).toBeVisible()
    await page.getByRole('button', { name: 'Mejorar a PYME' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Paso 2 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Confirmá el cambio' })).toBeVisible()
    await expect(page.getByText('₡9 900/mes').first()).toBeVisible()
  })

  test('encargos: cotizar abre pasos de respuesta', async ({ page }) => {
    await page.route('**/api/**', async (route: Route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/tenant/info')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { planNombre: 'EMPRENDEDOR', features: {} } }),
        })
        return
      }
      if (path.includes('/encargos')) {
        const payload = path.includes('kpis')
          ? { data: { pendientes: 1, pendientePago: 0, pagados: 0, ticketPromedioCotizado: 0 } }
          : {
              data: [{
                id: 7,
                productoNombre: 'Encargo test',
                nombreCliente: 'Ana',
                email: 'ana@test.com',
                telefono: '88888888',
                estado: 'PENDIENTE',
                notas: 'Quiero azul',
                modoPrecio: 'COTIZACION',
                tokenPublico: 'tok-test',
              }],
            }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
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
    await page.goto('/emprendedor/encargos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Encargo test/i })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /Encargo test/i }).click()
    await expect(page.getByRole('button', { name: 'Cotizar y aprobar' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Cotizar y aprobar' }).click()
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Precio a cobrar' })).toBeVisible()
  })
})
