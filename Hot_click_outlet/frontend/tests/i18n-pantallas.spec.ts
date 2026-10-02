import { test, expect, type Page } from '@playwright/test'
import { mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * P17: pantallas migradas renderizadas en inglés y portugués. El idioma se siembra en `hotclick-ui`
 * (lo lee `src/i18n/index.ts` al arrancar) y se comprueba que no queda el texto en español.
 */

const MOVIL = { width: 390, height: 844 }

async function sembrarIdioma(page: Page, language: 'en' | 'pt') {
  await page.addInitScript((idioma) => {
    localStorage.setItem('hotclick-ui', JSON.stringify({ state: { language: idioma }, version: 0 }))
  }, language)
}

test.describe('i18n en pantallas migradas', () => {
  test('en: inicio de Servicios HOT', async ({ page }) => {
    await sembrarIdioma(page, 'en')
    await sembrarSesion(page)
    await mockApisAcc(page)
    await page.setViewportSize(MOVIL)
    await page.goto('/servicios', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help you?' })).toBeVisible()
    for (const titulo of ["We'll find it for you", 'Product warranty', 'Digitize your inventory', 'Tell us about your experience']) {
      await expect(page.getByRole('button', { name: new RegExp(titulo) })).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'You have 2 requests in progress' })).toBeVisible()
    await expect(page.getByText('¿En qué te ayudamos?')).toHaveCount(0)
    await expect(page.getByText(/Tenés \d+ solicitud/)).toHaveCount(0)
  })

  test('pt: inicio de Servicios HOT y directorio de emprendimientos vacío', async ({ page }) => {
    await sembrarIdioma(page, 'pt')
    await sembrarSesion(page)
    await mockApisAcc(page)
    await page.setViewportSize(MOVIL)
    await page.goto('/servicios', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
    await expect(page.getByRole('heading', { level: 1, name: 'Como podemos ajudar?' })).toBeVisible()
    for (const titulo of ['Nós encontramos para você', 'Garantia de um produto', 'Digitalize seu estoque', 'Conte sua experiência']) {
      await expect(page.getByRole('button', { name: new RegExp(titulo) })).toBeVisible()
    }
    await expect(page.getByText('Te lo conseguimos')).toHaveCount(0)

    await page.route('**/convenios/publicos**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))
    await page.goto('/emprendimientos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Empreendimentos' })).toBeVisible()
    await expect(page.getByText('Em breve')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Empreender na HotClick' })).toBeVisible()
    await expect(page.getByText('Próximamente')).toHaveCount(0)
  })
})

test.describe('i18n sin idioma guardado', () => {
  test('es sigue siendo el predeterminado en Servicios HOT', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.setViewportSize(MOVIL)
    await page.goto('/servicios', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: '¿En qué te ayudamos?' })).toBeVisible()
  })
})
