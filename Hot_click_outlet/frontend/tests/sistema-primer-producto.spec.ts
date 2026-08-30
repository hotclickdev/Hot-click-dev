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
      userName: 'Ana',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  }
}

const EMPRESA_TIENDA = {
  nombreComercial: 'Demo Store',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  tagline: 'Todo empieza con un click.',
  whatsapp: '50688887777',
}

const PRODUCTO = {
  id: 42,
  nombre: 'Café molido 500 g',
  nombreProducto: 'Café molido 500 g',
  precioVenta: 4500,
  stockActual: 8,
  imagenPrincipalUrl: null,
}

function perfil(estadoEmpresa: string, visibilidadPublica: boolean) {
  return {
    id: 1,
    estadoEmpresa,
    visibilidadPublica,
    slug: 'demo',
    nombreEmpresa: 'Demo',
  }
}

async function mockApis(page: Page, { estadoEmpresa = 'ACTIVO', visibilidadPublica = true }: {
  estadoEmpresa?: string
  visibilidadPublica?: boolean
} = {}) {
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const json = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    })

    if (path.includes('/empresa/perfil')) return json(perfil(estadoEmpresa, visibilidadPublica))
    if (req.method() === 'POST' && path.endsWith('/productos')) return json(PRODUCTO)
    if (path.includes('/tienda/demo/productos/42')) return json(PRODUCTO)
    if (path.includes('/tienda/demo/productos')) {
      return json({ content: [PRODUCTO], totalPages: 1 })
    }
    if (path.includes('/tienda/demo')) return json(EMPRESA_TIENDA)
    if (path.includes('/productos/admin/todos')) {
      return json({ content: [PRODUCTO], totalPages: 1 })
    }
    return json([])
  })
}

async function sesion(page: Page, opts: {
  estadoEmpresa?: string
  visibilidadPublica?: boolean
} = {}) {
  await mockApis(page, opts)
  await page.addInitScript((auth: ReturnType<typeof payloadAuth>) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.removeItem('hotclick-setup-dismissed')
    const host = globalThis as typeof globalThis & { __hcClipboard?: string }
    host.__hcClipboard = ''
    const escribir = async (texto: string) => { host.__hcClipboard = String(texto) }
    if (navigator.clipboard) {
      navigator.clipboard.writeText = escribir
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: escribir, readText: async () => host.__hcClipboard },
      })
    }
  }, payloadAuth())
}

async function publicarProducto(page: Page) {
  await page.goto('/admin/productos/nuevo', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/emprendedor\/productos\/nuevo/)
  await expect(page.getByText('Nuevo Producto')).toBeVisible()
}

test.describe('Primer producto — Fase 0 sale de /admin a Figma', () => {
  test('el alta de producto ya no vive en Sistema', async ({ page }) => {
    await sesion(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await publicarProducto(page)
  })

  test('el listado de productos redirige al prefijo del plan', async ({ page }) => {
    await sesion(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/productos', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/emprendedor\/productos/)
    await expect(page.getByRole('heading', { name: 'Mis Productos' })).toBeVisible()
  })
})
