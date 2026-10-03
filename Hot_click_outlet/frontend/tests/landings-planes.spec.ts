import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const SHOTS = process.env.REDISENO_SHOTS

async function preparar(page: Page) {
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

const CASOS = [
  { ruta: '/emprende', id: 'emprendedor', query: 'emprendedor', contacto: false },
  { ruta: '/para-pymes', id: 'pyme', query: 'pyme', contacto: true },
  { ruta: '/negocio-plus-plan', id: 'negocioPlus', query: 'negocio-plus', contacto: true },
]

for (const ancho of [390, 1440]) {
  test.describe(`landings de plan @${ancho}`, () => {
    test.use({ viewport: { width: ancho, height: ancho === 390 ? 844 : 900 } })
    for (const c of CASOS) {
      test(`${c.ruta}: base Figma, montos [PENDIENTE], sin promesas que no existen`, async ({ page }) => {
        await preparar(page)
        await page.goto(c.ruta, { waitUntil: 'domcontentloaded' })
        const landing = page.getByTestId(`landing-${c.id}`)
        await expect(landing).toBeVisible()
        await expect(landing.getByRole('link', { name: 'Elegir este plan' }).first()).toHaveAttribute('href', `/registro-empresa?plan=${c.query}`)
        await expect(landing.getByText('[PENDIENTE]').first()).toBeVisible()
        const nombres: Record<string, string> = { emprendedor: 'Emprendedor', pyme: 'Pyme', negocioPlus: 'Negocio Plus' }
        if (ancho === 390) {
          // Celular: sin tabla cortada; selector de plan + una tarjeta, con el plan de la página preseleccionado.
          await expect(landing.getByRole('table')).toBeHidden()
          const movil = landing.getByTestId('comparativa-movil')
          await expect(movil).toBeVisible()
          await expect(movil.getByRole('button', { name: nombres[c.id], exact: true })).toHaveAttribute('aria-pressed', 'true')
          await expect(movil.getByText('Este plan')).toBeVisible()
          const queries: Record<string, string> = { Emprendedor: 'emprendedor', Pyme: 'pyme', 'Negocio Plus': 'negocio-plus' }
          const faltan: Record<string, number> = { Emprendedor: 4, Pyme: 0, 'Negocio Plus': 0 }
          for (const otro of Object.values(nombres)) {
            await movil.getByRole('button', { name: otro, exact: true }).click()
            await expect(movil.getByRole('button', { name: otro, exact: true })).toHaveAttribute('aria-pressed', 'true')
            const tarjeta = movil.getByTestId('tarjeta-plan-movil')
            await expect(tarjeta.getByRole('heading', { name: otro, exact: true })).toBeVisible()
            await expect(tarjeta.getByText('[PENDIENTE]')).toHaveCount(2)
            await expect(tarjeta.getByText('Cajas del punto de venta')).toBeVisible()
            await expect(tarjeta.getByTestId('no-incluidas').locator('li')).toHaveCount(faltan[otro])
            await expect(tarjeta.getByRole('link', { name: `Empezar con ${otro}` })).toHaveAttribute('href', `/registro-empresa?plan=${queries[otro]}`)
            const caja = await movil.boundingBox()
            expect(caja && caja.x + caja.width).toBeLessThanOrEqual(ancho)
          }
          await expect(movil.getByText('Sin límite').first()).toBeVisible()
          await movil.getByRole('button', { name: nombres[c.id], exact: true }).click()
          // El WhatsApp no flota sobre la foto ni la barra: va dentro de la página.
          await expect(page.locator('a[href^="https://wa.me"].fixed')).toBeHidden()
          await expect(landing.getByTestId('landing-whatsapp').getByRole('link', { name: 'Escribinos por WhatsApp' })).toBeVisible()
        } else {
          await expect(landing.getByRole('table')).toBeVisible()
          await expect(landing.getByTestId('comparativa-movil')).toBeHidden()
        }
        const texto = await landing.innerText()
        expect(texto).not.toMatch(/₡\s?\d|\d\s?%|cupos? gratis|soporte prioritario|sucursal|CRM/i)
        const puntos = landing.locator('ul').first()
        if (c.contacto) await expect(puntos).toContainText('Tu contacto visible en tu tienda')
        else await expect(puntos).not.toContainText('Tu contacto visible')
        // Sin scroll horizontal de página (la comparativa se desliza dentro de su caja).
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho)
        if (SHOTS) {
          // Alto completo como viewport: la barra inferior fija queda abajo, donde la ve el usuario al final.
          const alto = await page.evaluate(() => document.documentElement.scrollHeight)
          await page.setViewportSize({ width: ancho, height: alto })
          await page.waitForTimeout(300)
          await page.screenshot({ path: `${SHOTS}/landing-${c.id}-${ancho}.png` })
        }
      })
    }
  })
}
