import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

function barraMovil(page: Page) {
  return page.locator('nav.hc-bottom-nav')
}

test.describe('BottomNav — Productos · Servicios · Emprender', () => {
  test.use({ viewport: { width: 375, height: 700 } })

  test('muestra Productos, Servicios, Emprender, Pedido y Cuenta', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bar = barraMovil(page)
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Productos' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Servicios' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Emprender' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Pedido' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Cuenta' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Vender' })).toHaveCount(0)
    await expect(bar.getByRole('link', { name: 'Descubrí' })).toHaveCount(0)
    await expect(bar.getByRole('link', { name: 'Inicio' })).toHaveCount(0)
  })

  test('cada pestaña llega a su ruta; Pedido sigue en /carrito', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bar = barraMovil(page)

    await bar.getByRole('link', { name: 'Productos' }).click()
    await expect(page).toHaveURL(/\/productos/)

    await bar.getByRole('link', { name: 'Servicios' }).click()
    await expect(page).toHaveURL(/\/servicios/)

    await bar.getByRole('link', { name: 'Emprender' }).click()
    await expect(page).toHaveURL(/\/emprende$/)

    await bar.getByRole('link', { name: 'Pedido' }).click()
    await expect(page).toHaveURL(/\/carrito/)
    await expect(page.getByRole('heading', { level: 1, name: 'Tu pedido está vacío' })).toBeVisible()
  })

  test('/descubri sigue existiendo fuera de la barra', async ({ page }) => {
    await mockApis(page)
    await page.goto('/descubri', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/descubri/)
    await expect(page.locator('#root')).toBeVisible()
    await expect(barraMovil(page).getByRole('link', { name: 'Descubrí' })).toHaveCount(0)
  })

  test('el FAB de WhatsApp no compite con la barra', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: 'Consultar un producto por WhatsApp', exact: true })).toBeHidden()
    await expect(barraMovil(page)).toBeVisible()
  })
})

test.describe('WhatsApp FAB — desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sigue disponible como consulta, no como job', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const fab = page.getByRole('link', { name: 'Consultar un producto por WhatsApp', exact: true })
    await expect(fab).toBeVisible()
    await expect(fab).toHaveAttribute('href', /wa\.me\/50686667888/)
    await expect(fab).toHaveAttribute('href', /consulto%20un%20producto/)
  })
})
