import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const EMPRESA = {
  nombreComercial: 'Demo Store',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  tagline: 'Todo empieza con un click.',
  whatsapp: '50688887777',
}

async function mockTienda(page: Page, { productos = [], statusProductos = 200 }: {
  productos?: { id: number; nombre: string; precio: number; stock: number }[]
  statusProductos?: number
} = {}) {
  await page.route('**/api/tienda/demo**', async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.includes('/productos')) {
      const q = url.searchParams.get('q')
      const lista = q ? [] : productos
      await route.fulfill({
        status: statusProductos,
        contentType: 'application/json',
        body: JSON.stringify(
          statusProductos === 200
            ? { success: true, data: { content: lista, totalPages: 1 } }
            : { success: false, message: 'error' },
        ),
      })
      return
    }
    if (path.includes('/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: EMPRESA }),
    })
  })
}

test.describe('Tienda pública — catálogo vacío', () => {
  test('sin productos se ve como tienda nueva, no como catálogo roto', async ({ page }) => {
    await mockTienda(page, { productos: [] })
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Esta tienda está empezando' })).toBeVisible()
    await expect(page.getByText('Demo Store ya está en HotClick')).toBeVisible()
    await expect(page.getByText('No hay productos disponibles.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Buscar' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ver productos en HotClick' })).toHaveAttribute(
      'href',
      '/productos',
    )
    await expect(page.getByText('Tienda de Demo Store en HotClick')).toBeVisible()
  })

  test('si el catálogo no carga, se puede reintentar', async ({ page }) => {
    await mockTienda(page, { statusProductos: 500 })
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('No se pudo cargar el catálogo')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Esta tienda está empezando' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })

  test('búsqueda sin resultados no parece una tienda nueva', async ({ page }) => {
    await mockTienda(page, {
      productos: [{ id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }],
    })
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Agregar al pedido' })).toBeVisible()

    await page.getByPlaceholder('Buscar productos...').fill('xyz')
    await page.getByRole('button', { name: 'Buscar' }).click()

    await expect(page.getByText('No encontramos eso en esta tienda')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Esta tienda está empezando' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Ver todo el catálogo' }).click()
    await expect(page.getByRole('button', { name: 'Agregar al pedido' })).toBeVisible()
  })
})
