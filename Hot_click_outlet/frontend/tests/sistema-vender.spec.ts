import { test, expect, type Page, type Route } from '@playwright/test'
import { getAvailableModes, puedeUsarCaja } from '../src/utils/modes.ts'
import { construirPasosChecklist, debeMostrarChecklist } from '../src/pages/admin/sistema-inicio/sistemaChecklistPasos.ts'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

function payloadAuth({ rol, permissions = [] }: { rol: string; permissions?: string[] }) {
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
      permissions,
      roles: [rol],
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

function perfil(estadoEmpresa: string, visibilidadPublica: boolean) {
  return {
    id: 1,
    estadoEmpresa,
    visibilidadPublica,
    slug: 'demo',
    nombreEmpresa: 'Demo',
  }
}

async function mockApi(page: Page, {
  totalProductos = 0,
  estadoEmpresa = 'ACTIVO',
  visibilidadPublica = true,
}: {
  totalProductos?: number
  estadoEmpresa?: string
  visibilidadPublica?: boolean
} = {}) {
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/empresa/perfil')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: perfil(estadoEmpresa, visibilidadPublica) }),
      })
      return
    }
    if (path.includes('/tienda/demo/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: [{ id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }], totalPages: 1 },
        }),
      })
      return
    }
    if (path.includes('/tienda/demo/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    if (path.includes('/tienda/demo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: EMPRESA_TIENDA }),
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
    if (path.includes('/admin/dashboard') && !path.includes('/kpis')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { stockBajo: 0, totalProductos, totalUsuarios: 1, pedidosPendientes: 0, categorias: [] },
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

async function sesionEmprendedor(page: Page, opts: {
  totalProductos?: number
  estadoEmpresa?: string
  visibilidadPublica?: boolean
} = {}) {
  await mockApi(page, opts)
  await page.addInitScript((auth: ReturnType<typeof payloadAuth>) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.removeItem('hotclick-setup-dismissed')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  }, payloadAuth({ rol: 'EMPRENDEDOR' }))
}

test.describe('Vender — Sistema, no un admin genérico', () => {
  test('el dueño entra a Sistema y ve su tienda', async ({ page }) => {
    await sesionEmprendedor(page)
    await page.goto('/mode-select', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /qué vas a hacer hoy/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sistema/i })).toBeVisible()
    await expect(page.getByText('Productos, pedidos y tu plan')).toBeVisible()
    await expect(page.getByRole('button', { name: /panel de administración/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /caja registradora/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /ver mi tienda/i })).toBeVisible()

    await page.getByRole('button', { name: /ver mi tienda/i }).click()
    await expect(page).toHaveURL(/\/tienda\/demo/)
    await expect(page.getByText('Tienda de Demo Store en HotClick')).toBeVisible()
  })

  test('sin productos, el primer paso es publicar uno', async ({ page }) => {
    await sesionEmprendedor(page, { totalProductos: 0, visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Empezá a vender')).toBeVisible()
    const producto = page.getByRole('link', { name: /agregar un producto/i })
    await expect(producto).toHaveAttribute('href', '/admin/productos/nuevo')
    await expect(producto).toHaveClass(/hc-btn-primary/)
    await expect(page.getByRole('link', { name: /completar marca/i })).toHaveAttribute(
      'href',
      '/admin/configuracion?seccion=marca',
    )
    await expect(page.getByRole('link', { name: /completar marca/i })).not.toHaveClass(/hc-btn-primary/)
    await expect(page.getByRole('link', { name: /publicá tu tienda/i }).first()).toHaveAttribute(
      'href',
      '/admin/configuracion?seccion=marca',
    )
    await expect(page.getByRole('link', { name: /ver tu plan/i })).toHaveAttribute('href', '/admin/billing/planes')
    await expect(page.getByRole('link', { name: /abrí la caja/i })).toHaveAttribute('href', '/admin/pos')
  })

  test('con producto y tienda oculta, el checklist sigue y publicar es el primario', async ({ page }) => {
    await sesionEmprendedor(page, { totalProductos: 1, estadoEmpresa: 'ACTIVO', visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    // Perfil async: AccesoTiendaPublica (sin número de paso) confirma ACTIVO + oculta
    await expect(page.getByRole('link', { name: /^publicá tu tienda$/i })).toBeVisible({ timeout: 15000 })
    const checklist = page.getByTestId('sistema-checklist')
    await expect(checklist).toBeVisible()
    // El paso lleva número en el nombre accesible ("3 Publicá tu tienda")
    const publicar = checklist.getByRole('link', { name: /publicá tu tienda/i })
    await expect(publicar).toBeVisible()
    await expect(publicar).toHaveAttribute('href', '/admin/configuracion?seccion=marca')
    await expect(publicar).toHaveClass(/hc-btn-primary/)
    await expect(checklist.getByRole('link', { name: /agregar un producto/i })).toHaveCount(0)
  })

  test('con producto y tienda pública, el checklist de arranque ya no aparece', async ({ page }) => {
    await sesionEmprendedor(page, { totalProductos: 2, estadoEmpresa: 'ACTIVO', visibilidadPublica: true })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    // Esperar perfil: "Ver mi tienda" confirma ACTIVO + visible
    await expect(page.getByRole('link', { name: /^ver mi tienda$/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Empezá a vender')).toHaveCount(0)
  })

  test('el dueño abre la caja desde los modos, sin permiso pos.usar', async ({ page }) => {
    await sesionEmprendedor(page)
    await page.goto('/mode-select', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /caja registradora/i }).click()
    await expect(page).toHaveURL(/\/admin\/pos/)
    await expect(page.getByRole('heading', { name: /abrí el turno/i })).toBeVisible()
  })
})

test('el dueño usa caja sin el permiso granular pos.usar', () => {
  expect(puedeUsarCaja('EMPRENDEDOR', [])).toBe(true)
  expect(puedeUsarCaja('ADMIN', [])).toBe(true)
  expect(puedeUsarCaja('USUARIO_FINAL', [])).toBe(false)
  expect(getAvailableModes('EMPRENDEDOR', [], { empresaSlug: 'demo' }).map((m) => m.id)).toEqual([
    'admin',
    'pos',
    'store',
  ])
})

test('checklist: no se oculta solo por tener un producto si la tienda está oculta', () => {
  expect(debeMostrarChecklist({
    dismissed: false,
    totalProductos: 3,
    estadoEmpresa: 'ACTIVO',
    visibilidadPublica: false,
  })).toBe(true)
  expect(debeMostrarChecklist({
    dismissed: false,
    totalProductos: 3,
    estadoEmpresa: 'ACTIVO',
    visibilidadPublica: true,
  })).toBe(false)

  const pasosOculta = construirPasosChecklist({
    totalProductos: 1,
    estadoEmpresa: 'ACTIVO',
    visibilidadPublica: false,
  })
  expect(pasosOculta.find((p) => p.primario)?.id).toBe('publicar')

  const pasosSinPerfil = construirPasosChecklist({
    totalProductos: 1,
    estadoEmpresa: null,
    visibilidadPublica: null,
  })
  expect(pasosSinPerfil.some((p) => p.id === 'publicar')).toBe(true)
  expect(pasosSinPerfil.find((p) => p.primario)?.id).toBe('publicar')
})
