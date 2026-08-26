import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function leer(rel) {
  return readFileSync(join(raiz, rel), 'utf8')
}

const PRODUCTO = {
  id: 1,
  nombreProducto: 'Mouse',
  precioVenta: 5000,
  stockActual: 4,
}

async function mockFicha(page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    if (/\/api\/productos\/1(?:\?|$)/.test(url)) {
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
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

async function silenciarPopups(page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

test.describe('Ficha — Comprar ahora', () => {
  test('el primario va a datos y pago; agregar se queda en la ficha', async ({ page }) => {
    await mockFicha(page)
    await silenciarPopups(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos/1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Mouse' })).toBeVisible()

    const comprar = page.getByRole('button', { name: 'Comprar ahora' })
    await expect(comprar).toBeVisible()
    await expect(comprar).toHaveClass(/hc-btn-primary/)

    const agregar = page.getByRole('button', { name: 'Agregar al pedido' })
    await expect(agregar).toBeVisible()
    await expect(agregar).toHaveClass(/hc-btn-ghost/)
    await expect(agregar).not.toHaveClass(/hc-btn-primary/)

    await agregar.click()
    await expect(page).toHaveURL(/\/productos\/1/)
    await expect(page.getByRole('button', { name: 'Añadido' })).toBeVisible()

    await comprar.click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByRole('heading', { name: 'Método de pago' })).toBeVisible()
    await expect(page.getByText('Mouse ×1')).toBeVisible()
  })

  test('la ficha no pide cuenta antes del checkout', async ({ page }) => {
    await mockFicha(page)
    await silenciarPopups(page)
    await page.goto('/productos/1', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Comprar ahora' }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByRole('heading', { name: '¿Cómo querés continuar?' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Método de pago' })).toBeVisible()
  })
})

test('Comprar ahora reutiliza addItem y no cambia el cobro', () => {
  const hook = leer('src/pages/producto/useProductDetail.js')
  expect(hook).toContain("addItem({ ...normalizeProduct(product), tallaSeleccionada }, quantity)")
  expect(hook).toContain("navigate('/checkout')")
  expect(hook).toContain('handleComprarAhora')

  const acciones = leer('src/pages/producto/ProductBuyActions.jsx')
  expect(acciones).toContain('onClick={onComprarAhora}')
  expect(acciones).toContain('onAdd={onAdd}')
  expect(acciones).toContain('variant="primary"')

  const sticky = leer('src/pages/producto/StickyCartBar.jsx')
  expect(sticky).toContain('onClick={onComprarAhora}')
  expect(sticky).toContain("t('product.buyNow')")

  const quick = leer('src/components/ui/QuickViewModal.jsx')
  expect(quick).not.toContain('#4f7cff')
  expect(quick).toContain('navigate(\'/checkout\')')
  expect(quick).toContain('for (let i = 0; i < quantity; i++) addItem(product)')
})
