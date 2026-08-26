import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const EMPRESA = {
  nombreComercial: 'Demo Store',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
}

const PRODUCTO = { id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }

async function mockTiendaPdp(page) {
  await page.route('**/api/tienda/demo**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/productos/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: PRODUCTO }),
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

test.describe('Ficha de tienda — Comprar ahora', () => {
  test('el primario va al checkout de esta tienda; agregar se queda', async ({ page }) => {
    await mockTiendaPdp(page)
    await page.goto('/tienda/demo/producto/1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Mouse' })).toBeVisible()

    const comprar = page.getByRole('button', { name: 'Comprar ahora' })
    const agregar = page.getByRole('button', { name: 'Agregar al pedido' })
    await expect(comprar).toBeVisible()
    await expect(agregar).toBeVisible()

    await agregar.click()
    await expect(page).toHaveURL(/\/tienda\/demo\/producto\/1/)
    await expect(page.getByRole('button', { name: 'Agregado al pedido' })).toBeVisible()

    await comprar.click()
    await expect(page).toHaveURL(/\/tienda\/demo\/checkout/)
    await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
    await expect(page.getByText('Mouse')).toBeVisible()
    await expect(page.getByText('Pedido de Demo Store en HotClick')).toBeVisible()
  })
})

test('Comprar ahora de tienda usa el carrito de esa tienda', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const pagina = readFileSync(join(raiz, '../src/pages/tienda/TiendaProductoPage.jsx'), 'utf8')
  expect(pagina).toContain('agregarAlCarrito(producto, cantidad)')
  expect(pagina).toContain("navigate(`/tienda/${slug}/checkout`)")
  expect(pagina).toContain('if (!agregado) agregarAlCarrito(producto, cantidad)')
  expect(pagina).not.toContain('useCartStore')
})
