import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page, type Route } from '@playwright/test'
import { cuerpoMarca, validarMarca } from '../src/pages/admin/configuracion/sistemaMarcaHelpers.ts'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

const PERFIL = {
  id: 1,
  estadoEmpresa: 'ACTIVO',
  visibilidadPublica: true,
  slug: 'demo',
  nombreEmpresa: 'Demo',
  nombreComercial: 'Café de Ana',
  tagline: 'Tostado en Pérez Zeledón',
  numeroWhatsapp: '50688887777',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  logoUrl: '',
  footerTexto: '',
}

async function sesionDueño(page: Page, onPut?: (body: Record<string, unknown>) => void) {
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const json = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    })
    if (req.method() === 'PUT' && path.endsWith('/empresa/perfil')) {
      const body = req.postDataJSON() as Record<string, unknown>
      onPut?.(body)
      return json({ ...PERFIL, ...body })
    }
    if (path.includes('/empresa/perfil')) return json(PERFIL)
    return json([])
  })
  await page.addInitScript((auth: { state: Record<string, unknown>; version: number }) => {
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

test.describe('Sistema — marca de la tienda', () => {
  test('el dueño edita nombre y WhatsApp del perfil, no un localStorage de HotClick', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await sesionDueño(page, (body) => puts.push(body))
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin/configuracion?seccion=marca', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Cómo te ven en tu tienda')).toBeVisible()
    const nombre = page.getByLabel('Nombre comercial')
    await expect(nombre).toHaveValue('Café de Ana')
    await expect(page.getByLabel('Frase bajo el nombre')).toHaveValue('Tostado en Pérez Zeledón')
    await expect(page.getByLabel('WhatsApp')).toHaveValue('50688887777')
    await expect(page.getByLabel('Nombre comercial')).not.toHaveValue('HotClick')
    await expect(page.getByText('Tu tienda de electrónica y tecnología en Costa Rica')).toHaveCount(0)

    await nombre.fill('Café de Ana y Juan')
    await page.getByLabel('WhatsApp').fill('50686667888')
    await page.getByLabel('Color de acento hex').fill('#0EA5E9')
    await page.getByRole('button', { name: 'Guardar marca' }).click()

    await expect(page.getByText('Así te ven en tu tienda')).toBeVisible()
    expect(puts).toHaveLength(1)
    expect(puts[0].nombreComercial).toBe('Café de Ana y Juan')
    expect(puts[0].numeroWhatsapp).toBe('50686667888')
    expect(puts[0].tagline).toBe('Tostado en Pérez Zeledón')
    expect(puts[0].colorAcento).toBe('#0EA5E9')
    expect(puts[0].descripcion).toBeUndefined()
  })
})

test('la marca de Sistema no usa localStorage ni el formulario de Admin IT', () => {
  expect(validarMarca({
    nombreComercial: '',
    tagline: '',
    numeroWhatsapp: '',
    colorPrimario: '#E73B33',
    colorSecundario: '#152B5E',
    colorAcento: '#1747A8',
    logoUrl: '',
    footerTexto: '',
  }).nombreComercial).toBeTruthy()
  const cuerpo = cuerpoMarca({
    nombreComercial: '  Café  ',
    tagline: 'Hola',
    numeroWhatsapp: '5068',
    colorPrimario: '#E73B33',
    colorSecundario: '#152B5E',
    colorAcento: '#0EA5E9',
    logoUrl: '',
    footerTexto: ' Pie ',
  })
  expect(cuerpo.nombreComercial).toBe('Café')
  expect(cuerpo.colorAcento).toBe('#0EA5E9')

  const raiz = dirname(fileURLToPath(import.meta.url))
  const form = readFileSync(join(raiz, '../src/pages/admin/configuracion/SistemaMarcaForm.tsx'), 'utf8')
  const hook = readFileSync(join(raiz, '../src/pages/admin/configuracion/useSistemaMarcaForm.ts'), 'utf8')
  const config = readFileSync(join(raiz, '../src/pages/admin/AdminConfiguracion.tsx'), 'utf8')
  expect(form).not.toMatch(/localStorage\.(get|set)Item/)
  expect(hook).not.toMatch(/localStorage\.(get|set)Item/)
  expect(hook).toContain('empresaService.updatePerfil')
  expect(config).toContain('SistemaMarcaForm')
  expect(config).toContain('SeccionTienda')
})
