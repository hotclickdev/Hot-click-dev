import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const EMPRESA = {
  nombreComercial: 'Demo Store',
  colorPrimario: '#E73B33',
  colorSecundario: '#152B5E',
  colorAcento: '#1747A8',
  tagline: 'Todo empieza con un click.',
  whatsapp: '50688887777',
  footerTexto: 'Hecho en Costa Rica',
}

async function mockTiendaCatalogo(page: Page, empresa = EMPRESA) {
  await page.route('**/api/tienda/demo**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: [{ id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }], totalPages: 1 },
        }),
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
      body: JSON.stringify({ success: true, data: empresa }),
    })
  })
}

test.describe('Tienda tenant — theme', () => {
  test('chrome HotClick, sin gray-50, CTA de pedido', async ({ page }) => {
    await mockTiendaCatalogo(page)
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })

    const shell = page.locator('.hc-tenant-theme')
    await expect(shell).toBeVisible()
    const header = page.getByRole('banner').first()
    await expect(header.getByText('Demo Store', { exact: true })).toBeVisible()
    await expect(header.getByText('en HotClick', { exact: true })).toBeVisible()
    await expect(page.getByText('Hecho en Costa Rica')).toBeVisible()
    await expect(page.getByText('Demo Store · tienda en')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a HotClick' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('button', { name: 'Agregar al pedido' })).toBeVisible()
    await expect(shell).not.toHaveClass(/bg-gray-50/)

    const bg = await shell.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(248, 249, 251)')

    await expect(header.getByRole('link', { name: 'Pedido de esta tienda' })).toBeVisible()
    await expect(page.locator('nav.hc-bottom-nav')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Escribinos por WhatsApp' })).toHaveCount(0)
    // Sin barra inferior propia ni botón flotante: el WhatsApp del negocio vive en su encabezado (Figma 29:922).
    await expect(page.locator('nav.hc-tienda-bottom-nav')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'WhatsApp de Demo Store' })).toHaveCount(0)

    await page.setViewportSize({ width: 375, height: 700 })
    await expect(page.getByRole('link', { name: /^Ver pedido/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Agregar al pedido' }).click()
    const verPedido = page.getByRole('link', { name: /^Ver pedido · 1 producto/ })
    await expect(verPedido).toBeVisible()
    await verPedido.click()
    await expect(page).toHaveURL(/\/tienda\/demo\/carrito/)
    await expect(page.getByRole('heading', { name: 'Pedido de esta tienda' })).toBeVisible()
  })

  test('en móvil el anfitrión HotClick no se recorta', async ({ page }) => {
    await mockTiendaCatalogo(page, {
      ...EMPRESA,
      nombreComercial: 'Emprendimiento Super Largo De Prueba Costa Rica',
    })
    await page.setViewportSize({ width: 375, height: 700 })
    // En el perfil móvil la portada reemplaza al header (Figma 29:922): se revisa en una subruta que lo conserva.
    await page.goto('/tienda/demo/carrito', { waitUntil: 'domcontentloaded' })

    const header = page.getByRole('banner').first()
    const anfitrion = header.getByText('en HotClick', { exact: true })
    await expect(anfitrion).toBeVisible()

    const headerBox = await header.boundingBox()
    const anfitrionBox = await anfitrion.boundingBox()
    expect(headerBox).toBeTruthy()
    expect(anfitrionBox).toBeTruthy()
    expect(anfitrionBox!.x).toBeGreaterThanOrEqual(headerBox!.x - 1)
    expect(anfitrionBox!.x + anfitrionBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width + 1)
  })

  test('agregar al pedido de la tienda no toca el carrito de HotClick', async ({ page }) => {
    await mockTiendaCatalogo(page)
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cart', JSON.stringify({
        state: {
          items: [{ id: 99, nombre: 'Teclado', precio: 10000, cantidad: 1, stock: 2 }],
          cartUpdatedAt: Date.now(),
        },
        version: 0,
      }))
    })
    await page.goto('/tienda/demo', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Agregar al pedido' }).click()
    await expect(page.getByRole('button', { name: 'Agregado al pedido' })).toBeVisible()

    await expect.poll(async () => {
      return page.evaluate(() => {
        const marketplace = JSON.parse(localStorage.getItem('hotclick-cart') || '{}')
        const tienda = JSON.parse(localStorage.getItem('tienda-carrito') || '{}')
        return {
          marketplace: (marketplace.state?.items ?? []).map((i: { nombre: string }) => i.nombre),
          tienda: (tienda.state?.carrito ?? []).map((i: { producto: { nombre: string } }) => i.producto.nombre),
        }
      })
    }).toEqual({ marketplace: ['Teclado'], tienda: ['Mouse'] })

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Teclado', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Mouse', { exact: true })).toHaveCount(0)
  })
})

test('chrome de tienda: HotClick no se recorta y el footer no lo esconde', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const header = readFileSync(join(raiz, '../src/pages/tienda/TiendaHeader.tsx'), 'utf8')
  const footer = readFileSync(join(raiz, '../src/pages/tienda/TiendaFooter.tsx'), 'utf8')
  // "en HotClick" va en su propia línea, sin truncar: el nombre largo se recorta, el anfitrión no.
  const es = JSON.parse(readFileSync(join(raiz, '../src/i18n/locales/es.json'), 'utf8'))
  expect(header).toContain("{t('tienda.enHotclick')}")
  expect(header).toContain('truncate font-display')
  expect(es.tienda.enHotclick).toBe('en HotClick')
  expect(footer).toContain('{footerTexto ? <p className="mb-1">{footerTexto}</p> : null}')
  expect(footer).toContain('tienda en')
  expect(footer).toContain('HotClick')
})
