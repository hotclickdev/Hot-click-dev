import { test, expect, type Page, type Route } from '@playwright/test'
import { payloadAuth } from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const SHOTS = process.env.REDISENO_SHOTS

const PLANES = [
  { id: 1, nombre: 'EMPRENDEDOR', maxProductos: 50, maxUsuarios: 2, tienePos: true, tieneCompras: false, tieneGiftCards: false, tieneAi: false },
  { id: 2, nombre: 'PYME', maxProductos: 500, maxUsuarios: 5, tienePos: true, tieneCompras: true, tieneGiftCards: true, tieneAi: true },
  { id: 3, nombre: 'NEGOCIO_PLUS', maxProductos: -1, maxUsuarios: -1, tienePos: true, tieneCompras: true, tieneGiftCards: true, tieneAi: true },
]

async function sesion(page: Page, planNombre: string, uso = { productos: 63, usuarios: 1 }) {
  const llamadasCambio: string[] = []
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (path.includes('/tenant/info')) return json({ success: true, data: { planNombre, features: { ai: planNombre !== 'EMPRENDEDOR' } } })
    if (path.includes('/tenant/uso')) return json(uso)
    if (path.includes('/billing/planes')) return json(PLANES)
    if (path.includes('/billing/cambiar-plan')) {
      llamadasCambio.push(path)
      return json({ status: 'pendiente_ciclo', mensaje: 'ok' })
    }
    if (path.includes('/empresa/perfil')) return json({ success: true, data: { id: 1, nombreComercial: 'Demo', nombreEmpresa: 'Demo' } })
    return json({ success: true, data: [] })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  }, payloadAuth())
  return llamadasCambio
}

async function captura(page: Page, nombre: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${nombre}.png`, fullPage: true })
}

for (const ancho of [390, 1440]) {
  test.describe(`paneles rediseñados · ${ancho}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    })

    test('Planes (/admin/billing/planes): montos [PENDIENTE] y bajar bloqueado mientras el uso supere el plan', async ({ page }) => {
      const llamadas = await sesion(page, 'PYME')
      await page.goto('/admin/billing/planes', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Planes', exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('[PENDIENTE]').first()).toBeVisible()
      await expect(page.locator('main, body').first()).not.toContainText('₡')
      await expect(page.getByRole('button', { name: 'Mejorar a Negocio Plus' })).toBeVisible()
      await page.getByRole('button', { name: 'Bajar a Emprendedor' }).click()
      const aviso = page.getByTestId('aviso-bajada-bloqueada')
      await expect(aviso).toBeVisible()
      await expect(aviso).toContainText('Todavía no podés bajar a Emprendedor')
      await expect(aviso).toContainText('Tenés 63 productos y Emprendedor permite 50')
      await expect(aviso).toContainText('No borramos nada')
      expect(llamadas).toEqual([])
      await captura(page, `panel-planes-bajada-bloqueada-${ancho}`)
    })

    test('Sistema: fondo n50 y bordes n200 (sin crema)', async ({ page }) => {
      await sesion(page, 'EMPRENDEDOR')
      await page.goto('/admin/billing/planes', { waitUntil: 'domcontentloaded' })
      const tema = page.locator('.hc-sistema-theme').first()
      await expect(tema).toBeVisible({ timeout: 15_000 })
      const colores = await tema.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { bg: cs.getPropertyValue('--hc-bg').trim(), borde: cs.getPropertyValue('--hc-border').trim(), fondo: cs.backgroundColor }
      })
      expect(colores.fondo).toBe('rgb(248, 249, 251)')
      expect(colores.bg.toLowerCase()).not.toContain('ede5da')
      expect(colores.borde.toLowerCase()).not.toContain('d6cbb8')
      await captura(page, `panel-sistema-planes-emprendedor-${ancho}`)
    })

    test('Emprendedor › Opciones: sin «Consultas con Hot» (no tiene IA)', async ({ page }) => {
      await sesion(page, 'EMPRENDEDOR')
      await page.goto('/emprendedor/opciones', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Opciones' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Editar perfil')).toBeVisible()
      await expect(page.getByText('Consultas con Hot')).toHaveCount(0)
      await captura(page, `emprendedor-opciones-${ancho}`)
      await page.goto('/emprendedor/opciones/consultas', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/emprendedor\/opciones$/)
    })
  })
}

test.describe('Tu plan del panel Pyme (/pyme/plan)', () => {
  for (const ancho of [390, 1440]) {
    test(`bajar a Emprendedor con 63 productos queda bloqueado con aviso · ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
      const llamadas = await sesion(page, 'PYME')
      await page.goto('/pyme/plan', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('button', { name: 'Bajar a Emprendedor' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('button', { name: 'Mejorar a Negocio Plus' })).toBeVisible()
      await page.getByRole('button', { name: 'Bajar a Emprendedor' }).click()
      await page.getByRole('button', { name: 'Continuar' }).click()
      await page.getByRole('button', { name: 'Confirmar cambio' }).click()
      const aviso = page.getByTestId('aviso-bajada-bloqueada')
      await expect(aviso).toBeVisible()
      await expect(aviso).toContainText('Tenés 63 productos y Emprendedor permite 50')
      await expect(aviso.getByRole('link', { name: 'Ir a mis productos' })).toHaveAttribute('href', '/pyme/productos')
      expect(llamadas).toEqual([])
      await captura(page, `pyme-tu-plan-bajada-bloqueada-${ancho}`)
    })
  }
})

test.describe('Mi equipo en Emprendedor y Negocio Plus (decisión 3.3 A)', () => {
  for (const ancho of [390, 1440]) {
    test(`Emprendedor › Opciones › Mi equipo · ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
      await sesion(page, 'EMPRENDEDOR')
      await page.goto('/emprendedor/opciones', { waitUntil: 'domcontentloaded' })
      await page.getByText('Mi equipo').click()
      await expect(page).toHaveURL(/\/emprendedor\/opciones\/equipo$/)
      await expect(page.getByRole('heading', { name: 'Mi Equipo' })).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: '+ Invitar miembro' }).first().click()
      await expect(page.getByText('Paso 1 de 4')).toBeVisible()
      await captura(page, `emprendedor-equipo-${ancho}`)
      await page.goto('/emprendedor/equipo', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/emprendedor\/opciones\/equipo$/)
      // Los atajos planos llevan a Opciones sin duplicar el segmento (antes: /emprendedor/plan/opciones/plan).
      await page.goto('/emprendedor/plan', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/emprendedor\/opciones\/plan$/)
    })

    test(`Negocio Plus › Mi equipo · ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
      await sesion(page, 'NEGOCIO_PLUS')
      await page.goto('/negocio-plus/opciones', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Mis sucursales')).toBeVisible({ timeout: 15_000 })
      await page.getByText('Mi equipo').click()
      await expect(page).toHaveURL(/\/negocio-plus\/equipo$/)
      await expect(page.getByRole('heading', { name: 'Mi Equipo' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Todavía no hay miembros')).toBeVisible()
      await page.waitForTimeout(400)
      await captura(page, `negocio-plus-equipo-${ancho}`)
    })
  }
})

test.describe('Sucursales de Negocio Plus sin ventas en 0 (decisión 3.9 B)', () => {
  for (const ancho of [390, 1440]) {
    test(`no muestra montos de ventas que el backend todavía no mide · ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
      await sesion(page, 'NEGOCIO_PLUS')
      await page.route('**/api/sucursales**', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, nombre: 'Escazú', ubicacion: 'Multiplaza', activo: true, ventasMes: 0 },
            { id: 2, nombre: 'Heredia', activo: true, ventasMes: 0 },
          ],
        }),
      }))
      await page.goto('/negocio-plus/sucursales', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: 'Mis Sucursales' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Escazú')).toBeVisible()
      await expect(page.getByText('Multiplaza')).toBeVisible()
      await expect(page.getByText('Activas')).toBeVisible()
      await expect(page.getByText(/este mes|Ventas totales|₡\s?0/)).toHaveCount(0)
      await page.waitForTimeout(400)
      await captura(page, `negocio-plus-sucursales-${ancho}`)
    })
  }
})
