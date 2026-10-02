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

/** Barra inferior móvil del comprador (Figma `7:358`). */
function barraMovil(page: Page) {
  return page.getByRole('navigation', { name: 'Navegación principal' })
}

test.describe('Barra inferior móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('muestra Inicio, Buscar, Categorías, Pedido y Cuenta', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bar = barraMovil(page)
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Inicio' })).toBeVisible()
    await expect(bar.getByRole('button', { name: 'Buscar' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Categorías' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Pedido' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Cuenta' })).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  })

  test('cada pestaña llega a su ruta', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await barraMovil(page).getByRole('link', { name: 'Categorías' }).click()
    await expect(page).toHaveURL(/\/categorias/)

    await barraMovil(page).getByRole('link', { name: 'Pedido' }).click()
    await expect(page).toHaveURL(/\/carrito/)
    await expect(page.getByRole('heading', { level: 1, name: 'Tu pedido está vacío' })).toBeVisible()
  })

  test('marca Inicio en el blog', async ({ page }) => {
    await mockApis(page)
    await page.goto('/blog', { waitUntil: 'domcontentloaded' })
    await expect(barraMovil(page).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  })

  test('marca Categorías en /productos?cat=', async ({ page }) => {
    await mockApis(page)
    await page.goto('/productos?cat=1', { waitUntil: 'domcontentloaded' })
    await expect(barraMovil(page).getByRole('link', { name: 'Categorías' })).toHaveAttribute('aria-current', 'page')
    await expect(barraMovil(page).getByRole('button', { name: 'Buscar' })).toBeVisible()
  })

  test('marca Cuenta en las solicitudes de Servicios HOT', async ({ page }) => {
    await mockApis(page)
    // La vista exige sesión; sin token redirige a /login.
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-auth', JSON.stringify({
        state: { token: 'tok-prueba', userId: 1, userEmail: 'a@b.cr', userRole: 'USER', userName: 'Ana Prueba' },
        version: 0,
      }))
    })
    await page.goto('/servicios?vista=solicitudes', { waitUntil: 'domcontentloaded' })
    await expect(barraMovil(page).getByRole('link', { name: 'Cuenta' })).toHaveAttribute('aria-current', 'page')
  })

  test('/descubri sigue existiendo fuera de la barra', async ({ page }) => {
    await mockApis(page)
    await page.goto('/descubri', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/descubri/)
    await expect(page.locator('#root')).toBeVisible()
    await expect(barraMovil(page).getByRole('link', { name: 'Descubrí' })).toHaveCount(0)
  })

  test('el FAB de WhatsApp queda sobre la barra sin solaparse (Figma 51:2262)', async ({ page }) => {
    await mockApis(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const fab = page.getByRole('link', { name: 'Consultar un producto por WhatsApp', exact: true })
    await expect(fab).toBeVisible()
    await expect(barraMovil(page)).toBeVisible()
    const cajaFab = await fab.boundingBox()
    const cajaBarra = await barraMovil(page).boundingBox()
    expect(cajaFab && cajaBarra && cajaFab.y + cajaFab.height <= cajaBarra.y).toBe(true)
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
