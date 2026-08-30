import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page, type Route } from '@playwright/test'
import { puedePublicarTienda, tiendaEsPublica, RUTA_SISTEMA_VISIBILIDAD } from '../src/utils/rutaTienda'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
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

async function sesionDueño(page: Page, { estadoEmpresa, visibilidadPublica }: {
  estadoEmpresa: string
  visibilidadPublica: boolean
}) {
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const json = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    })

    if (req.method() === 'PUT' && path.includes('/empresa/perfil/visibilidad')) {
      return json({ visibilidadPublica: true, estadoEmpresa: 'ACTIVO' })
    }
    if (path.includes('/empresa/perfil')) return json(perfil(estadoEmpresa, visibilidadPublica))
    if (path.includes('/admin/dashboard') && !path.includes('/kpis')) {
      return json({ stockBajo: 0, totalProductos: 1, totalUsuarios: 1, pedidosPendientes: 0, categorias: [] })
    }
    return json([])
  })
  await page.addInitScript((auth: unknown) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hotclick-setup-dismissed', '1')
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

test.describe('Sistema — publicar la tienda', () => {
  test('si está oculta, el dueño publica desde Configuración, no desde un link 404', async ({ page }) => {
    await sesionDueño(page, { estadoEmpresa: 'ACTIVO', visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Tu tienda está oculta')).toBeVisible()
    await expect(page.locator(`a[href="${RUTA_SISTEMA_VISIBILIDAD}"]`, { hasText: 'Configuración' })).toBeVisible()
    const publica = page.getByRole('link', { name: 'Publicá tu tienda' })
    await expect(publica).toHaveAttribute('href', RUTA_SISTEMA_VISIBILIDAD)
    await expect(page.getByRole('link', { name: 'Ver mi tienda' })).toHaveCount(0)

    await publica.click()
    await expect(page).toHaveURL(/\/admin\/configuracion\?seccion=marca/)
    const interruptor = page.getByRole('switch', { name: 'Visibilidad pública' })
    await expect(interruptor).toHaveAttribute('aria-checked', 'false')
    await interruptor.click()
    await expect(interruptor).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Tu tienda ya es visible al público')).toBeVisible()
  })

  test('si HotClick aún no aprobó, no ofrece un link público falso', async ({ page }) => {
    await sesionDueño(page, { estadoEmpresa: 'PENDIENTE_APROBACION', visibilidadPublica: false })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Tu negocio está pendiente de aprobación')).toBeVisible()
    await expect(page.getByText('Tu tienda se publica cuando HotClick apruebe el negocio')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Publicá tu tienda' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ver mi tienda' })).toHaveCount(0)
  })
})

test('la regla de tienda pública no mezcla pendiente con oculto', () => {
  expect(tiendaEsPublica({ estadoEmpresa: 'ACTIVO', visibilidadPublica: true })).toBe(true)
  expect(puedePublicarTienda({ estadoEmpresa: 'ACTIVO', visibilidadPublica: false })).toBe(true)
  expect(puedePublicarTienda({ estadoEmpresa: 'PENDIENTE_APROBACION', visibilidadPublica: false })).toBe(false)
  expect(RUTA_SISTEMA_VISIBILIDAD).toBe('/admin/configuracion?seccion=marca')

  const raiz = dirname(fileURLToPath(import.meta.url))
  const inicio = readFileSync(join(raiz, '../src/pages/admin/SistemaInicio.tsx'), 'utf8')
  const layout = readFileSync(join(raiz, '../src/layouts/AdminLayout.tsx'), 'utf8')
  const config = readFileSync(join(raiz, '../src/pages/admin/AdminConfiguracion.tsx'), 'utf8')
  expect(inicio).toContain('AccesoTiendaPublica')
  expect(layout).toContain('RUTA_SISTEMA_VISIBILIDAD')
  expect(config).toContain('SistemaVisibilidadMarca')
})
