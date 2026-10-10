import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/** Alta de vendedor sobre la base de Figma (propuesta de Diseño aprobada 3-oct-2026). */
const SHOTS = process.env.REDISENO_SHOTS

async function mockApi(page: Page, onRegistro?: (body: unknown) => void) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/auth/registro-empresa')) {
      onRegistro?.(route.request().postDataJSON())
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR' })).toString('base64') + '.x', correo: 'ana@correo.com', rol: 'EMPRENDEDOR', empresaId: 9 } }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
}

async function shot(page: Page, nombre: string) {
  if (!SHOTS) return
  const w = page.viewportSize()?.width ?? 0
  await page.screenshot({ path: `${SHOTS}/${nombre}-${w}.png`, fullPage: true })
}

for (const ancho of [390, 1440]) {
  test.describe(`alta de vendedor @${ancho}`, () => {
    test.use({ viewport: { width: ancho, height: ancho === 390 ? 844 : 900 } })

    test('paso 1: tres planes, contacto solo en Pyme y Plus, montos en [PENDIENTE], sin cupos', async ({ page }) => {
      await mockApi(page)
      await page.goto('/registro-empresa', { waitUntil: 'domcontentloaded' })
      if (ancho === 390) {
        await expect(page.getByRole('heading', { name: 'Elegí tu plan' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Continuar con Emprendedor' })).toBeVisible()
      } else {
        await expect(page.getByRole('heading', { name: /Empezá a vender en HotClick/ })).toBeVisible()
      }
      await expect(page.getByText(ancho === 390 ? '1 · Plan' : 'Paso 1 de 3')).toBeVisible()
      await expect(page.getByRole('radio')).toHaveCount(3)
      await expect(page.getByTestId('plan-emprendedor')).not.toContainText('Tu contacto visible')
      await expect(page.getByTestId('plan-pyme')).toContainText('Tu contacto visible en tu tienda')
      await expect(page.getByTestId('plan-negocio-plus')).toContainText('Tu contacto visible en tu tienda')
      if (ancho === 390) await expect(page.getByText('Emprendedor · [PENDIENTE]')).toBeVisible()
      else await expect(page.getByTestId('plan-emprendedor').getByText('[PENDIENTE]')).toBeVisible()
      const texto = await page.locator('main').innerText()
      expect(texto).not.toMatch(/₡\s?\d|\d\s?%|cupos? gratis/i)
      await shot(page, 'alta-paso1-plan')
    })

    test('paso 2: Acuerdo obligatorio; Emprendedor sin "WhatsApp de tu tienda"; crea y muestra Listo', async ({ page }) => {
      let enviado: Record<string, unknown> | null = null
      await mockApi(page, (b) => { enviado = b as Record<string, unknown> })
      await page.goto('/registro-empresa', { waitUntil: 'domcontentloaded' })
      if (ancho === 390) await page.getByRole('button', { name: 'Continuar con Emprendedor' }).click()
      else await page.getByTestId('plan-emprendedor').getByRole('button', { name: 'Elegir este plan' }).click()
      await expect(page.getByText(ancho === 390 ? '2 · Tu negocio' : 'Paso 2 de 3')).toBeVisible()
      await expect(page).toHaveURL(/plan=emprendedor/)
      await expect(page.getByText(/WhatsApp de tu tienda/i)).toHaveCount(0)
      await page.getByLabel('Nombre del negocio (obligatorio)').fill('Tienda Tica')
      await page.getByLabel('Tu correo (obligatorio)').fill('ana@correo.com')
      await page.getByLabel('Contraseña (obligatorio)').fill('secreta123')
      await page.getByLabel(/Términos y Condiciones/).check()
      const crear = page.getByRole('button', { name: 'Crear mi cuenta' })
      if (ancho === 390) {
        await expect(crear).toBeEnabled()
        await crear.click()
        await expect(page.getByText('Para continuar, aceptá el Acuerdo de Vendedores.').first()).toBeVisible()
      } else {
        await expect(crear).toBeDisabled()
      }
      await shot(page, 'alta-paso2-negocio')
      await page.getByLabel(/Acuerdo de Vendedores/).check()
      await expect(crear).toBeEnabled()
      await crear.click()
      await expect(page.getByTestId('alta-listo')).toBeVisible()
      expect(enviado?.['nombreEmpresa']).toBe('Tienda Tica')
      await shot(page, 'alta-listo')
    })

    test('Pyme va al paso 3 (activar plan) sin que el guard de sesión gane la carrera (BUG-03)', async ({ page }) => {
      await mockApi(page)
      await page.goto('/registro-empresa?plan=pyme', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Plan Pyme', { exact: true })).toBeVisible()
      await page.getByLabel('Nombre del negocio (obligatorio)').fill('Ferre Pyme')
      await page.getByLabel('Tu correo (obligatorio)').fill('ana@correo.com')
      await page.getByLabel('Contraseña (obligatorio)').fill('secreta123')
      await page.getByLabel(/Términos y Condiciones/).check()
      await page.getByLabel(/Acuerdo de Vendedores/).check()
      await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
      await expect(page).toHaveURL(/\/registro-empresa\/activar-plan\?plan=pyme/)
      await expect(page.getByText(ancho === 390 ? '3 · Activar' : 'Paso 3 de 3')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Pagar después' })).toBeVisible()
      await shot(page, 'alta-paso3-activar')
    })
  })
}
