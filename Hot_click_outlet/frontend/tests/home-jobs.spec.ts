import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockHomeApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

function seccionJobs(page: Page) {
  return page.locator('section[aria-labelledby="home-jobs-heading"]')
}

test.describe('Home — Compra · Vende · Emprende', () => {
  test('CTA comprar dominante y copy buy-first en móvil', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const jobs = seccionJobs(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Comprá en Costa Rica' })).toBeVisible()
    await expect(jobs.getByText(/Catálogo de emprendedores/)).toBeVisible()
    await expect(jobs.getByRole('link', { name: 'Comprar' })).toBeVisible()
    await expect(jobs.getByRole('link', { name: 'Vender' })).toBeVisible()
    await expect(jobs.getByRole('link', { name: 'Emprender' })).toBeVisible()

    const comprar = jobs.getByRole('link', { name: 'Comprar' })
    const box = await comprar.boundingBox()
    expect(box, 'Comprar debe estar en el fold').toBeTruthy()
    expect(box!.y + box!.height).toBeLessThan(700)
  })

  test('Comprar va a catálogo; Vender y Emprender a /emprende', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const jobs = seccionJobs(page)
    await jobs.getByRole('link', { name: 'Comprar' }).click()
    await expect(page).toHaveURL(/\/productos/)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await seccionJobs(page).getByRole('link', { name: 'Vender' }).click()
    await expect(page).toHaveURL(/\/emprende$/)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await seccionJobs(page).getByRole('link', { name: 'Emprender' }).click()
    await expect(page).toHaveURL(/\/emprende$/)
  })

  test('cómo comprar enseña datos y pago, no WhatsApp desde el carrito', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('#como-comprar').scrollIntoViewIfNeeded()

    await expect(page.getByRole('heading', { name: 'Datos y pago' })).toBeVisible()
    await expect(page.getByText('Pide por WhatsApp')).toHaveCount(0)
    await expect(page.getByText(/Desde el carrito envíanos/)).toHaveCount(0)
  })

  test('la franja de confianza no manda a comprar por WhatsApp', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Comprá en la web')).toBeVisible()
    await expect(page.getByText('Pedido, datos y pago')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Escribinos por WhatsApp' })).toHaveCount(0)
    await expect(page.getByText('El trato por WhatsApp')).toHaveCount(0)
    await expect(page.getByText('mandé el WhatsApp')).toHaveCount(0)
    await expect(page.getByText('✦')).toHaveCount(0)
  })

  test('Servicios Hot y el pie no usan emojis', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('✦')).toHaveCount(0)
  })
})
