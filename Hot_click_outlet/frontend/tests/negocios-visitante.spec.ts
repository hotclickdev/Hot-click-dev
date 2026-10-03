import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const NEGOCIOS = [
  { slug: 'bruma-cafe', nombre: 'Bruma Café', logoUrl: '', categoria: 'Comidas', plan: 'EMPRENDEDOR', productos: 4 },
  { slug: 'casa-luna-506', nombre: 'Casa Luna 506', logoUrl: '', categoria: 'Hogar', plan: 'PYME', productos: 8 },
]

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/public/negocios') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const data = NEGOCIOS.filter((n) => !q || n.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
}

test.describe('Tiendas por plan en la barra de categorías', () => {
  test('desktop: Emprendimientos, Pymes y Negocio Plus después de "Todas las categorías"', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const nav = page.getByRole('navigation', { name: /categor/i }).first()
    for (const [texto, alias] of [['Emprendimientos', 'emprendimientos'], ['Pymes', 'pymes'], ['Negocio Plus', 'negocio-plus']]) {
      await expect(nav.getByRole('link', { name: texto, exact: true })).toHaveAttribute('href', `/emprendimientos?plan=${alias}`)
    }
    const textos = await nav.getByRole('link').allInnerTexts()
    expect(textos.slice(0, 4).map((t) => t.trim())).toEqual(['Todas las categorías', 'Emprendimientos', 'Pymes', 'Negocio Plus'])
  })

  test('móvil: las mismas entradas al inicio de la fila de chips', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const nav = page.locator('header nav').filter({ has: page.getByRole('link', { name: 'Pymes', exact: true }) }).first()
    await expect(nav.getByRole('link', { name: 'Negocio Plus', exact: true })).toBeVisible()
  })
})

test.describe('Buscador: negocios por nombre', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('grupo Negocios con plan y enlace a la tienda, sin contacto', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('header button', { hasText: /Buscá/ }).first().click()
    await page.getByRole('dialog').getByRole('searchbox').fill('luna')
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByText('Negocios', { exact: true })).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Casa Luna 506: ver tienda' })).toContainText('Pyme')
    await expect(dialogo.locator('a[href*="wa.me"]')).toHaveCount(0)
    await dialogo.getByRole('button', { name: 'Casa Luna 506: ver tienda' }).click()
    await expect(page).toHaveURL(/\/tienda\/casa-luna-506$/)
  })

  test('estado vacío sin productos ni negocios', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('header button', { hasText: /Buscá/ }).first().click()
    await page.getByRole('dialog').getByRole('searchbox').fill('zzqx')
    await expect(page.getByRole('dialog').getByText(/No encontramos productos ni negocios para “zzqx”/)).toBeVisible()
  })
})
