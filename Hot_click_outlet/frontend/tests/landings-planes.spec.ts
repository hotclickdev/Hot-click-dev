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
        await expect(landing.getByRole('table')).toBeVisible()
        const texto = await landing.innerText()
        expect(texto).not.toMatch(/₡\s?\d|\d\s?%|cupos? gratis|soporte prioritario|sucursal|CRM/i)
        const puntos = landing.locator('ul').first()
        if (c.contacto) await expect(puntos).toContainText('Tu contacto visible en tu tienda')
        else await expect(puntos).not.toContainText('Tu contacto visible')
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/landing-${c.id}-${ancho}.png`, fullPage: true })
      })
    }
  })
}
