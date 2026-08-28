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

async function esperarLinkCopiado(page: Page) {
  await page.getByRole('button', { name: 'Copiar link de tu tienda' }).click()
  await expect(page.getByRole('button', { name: 'Link copiado' })).toBeVisible()
  const clip = await page.evaluate(() => (globalThis as typeof globalThis & { __hcClipboard?: string }).__hcClipboard)
  expect(clip).toMatch(/\/tienda\/demo$/)
}

async function publicarProducto(page: Page) {
  await page.goto('/admin/productos/nuevo', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Agregá un producto' })).toBeVisible()
  await page.getByPlaceholder('Ej: Café molido 500 g').fill('Café molido 500 g')
  await page.locator('input[type="number"]').first().fill('4500')
  await page.getByRole('button', { name: 'Guardá el producto' }).click()
}

test.describe('Primer producto — verlo en la tienda', () => {
  test('después de publicar, el dueño abre el producto en su tienda', async ({ page }) => {
    await sesion(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await publicarProducto(page)

    await expect(page.getByRole('heading', { name: 'Ya está en tu tienda' })).toBeVisible()
    await expect(page.getByText('/tienda/demo', { exact: true })).toBeVisible()
    await esperarLinkCopiado(page)
    const ver = page.getByRole('link', { name: 'Verlo en tu tienda' })
    await expect(ver).toHaveAttribute('href', '/tienda/demo/producto/42')
    await ver.click()
    await expect(page).toHaveURL(/\/tienda\/demo\/producto\/42/)
    await expect(page.getByText('Café molido 500 g')).toBeVisible()
  })

  test('si el negocio no está activo, no finge un link público', async ({ page }) => {
    await sesion(page, { estadoEmpresa: 'PENDIENTE_APROBACION', visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await publicarProducto(page)

    await expect(page.getByRole('heading', { name: 'Producto listo en Sistema' })).toBeVisible()
    await expect(page.getByText('Producto enviado a revisión')).toHaveCount(0)
    await expect(page.getByText(/un admin lo va a revisar/i)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Verlo en tu tienda' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copiar link de tu tienda' })).toHaveCount(0)
    await expect(page.getByText(/cuando hotclick active tu negocio/i)).toBeVisible()
    await expect(page.getByText('/tienda/demo')).toBeVisible()
  })

  test('el listado enlaza la tienda pública cuando ya está activa', async ({ page }) => {
    await sesion(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/productos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver mi tienda' })).toHaveAttribute('href', '/tienda/demo')
    await esperarLinkCopiado(page)
  })

  test('si la tienda está oculta, el dueño puede publicarla', async ({ page }) => {
    await sesion(page, { estadoEmpresa: 'ACTIVO', visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await publicarProducto(page)

    await expect(page.getByRole('heading', { name: 'Producto listo en Sistema' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Verlo en tu tienda' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copiar link de tu tienda' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Publicála' })).toHaveAttribute(
      'href',
      '/admin/configuracion?seccion=marca',
    )
  })
})
