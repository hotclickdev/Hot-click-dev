import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTOS = [
  {
    id: 1,
    nombreProducto: 'Taza personalizada con nombre y color',
    precioVenta: 11000,
    stockActual: 4,
    empresaNombre: 'Casa Luna 506',
    descripcionCorta: 'Regalo para mamá',
    categoria: { id: 1, nombreCategoria: 'Regalos' },
  },
  {
    id: 2,
    nombreProducto: 'Sérum facial de día',
    precioVenta: 28900,
    stockActual: 3,
    empresaNombre: 'Taller Ceiba',
    descripcionCorta: 'Cuidado de la piel',
    categoria: { id: 2, nombreCategoria: 'Cuidado' },
  },
]

const PAYLOAD = '<img src=x onerror=alert(1)>'

async function preparar(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    let data: unknown = []
    if (url.includes('/destacados')) data = PRODUCTOS
    else if (/\/api\/productos\/\d+/.test(url)) data = PRODUCTOS[0]
    else if (url.includes('/productos')) data = { content: PRODUCTOS, totalElements: PRODUCTOS.length }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  page.on('dialog', () => { throw new Error('la búsqueda no debe ejecutar un diálogo') })
}

test.describe('Lupa: resultados, seguridad y navegación', () => {
  test('en escritorio filtra por palabras y muestra el asistente aunque no haya producto', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const buscador = page.getByRole('searchbox', { name: 'Buscar' })
    await buscador.fill('regalo para mi mamá')
    const panel = page.getByRole('region', { name: 'Buscar en HotClick' })
    await expect(panel.getByText('Preguntale al asistente')).toBeVisible()
    await expect(panel.getByText('regalos')).toBeVisible()
    await expect(panel.getByText('Taza personalizada con nombre y color')).toBeVisible()
    await expect(panel.getByText('Sérum facial de día')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /Ver el resultado de/ })).toBeVisible()
    await expect(panel.getByText('Buscar con una foto')).toBeVisible()

    await buscador.fill('sds')
    await expect(panel.getByText('Preguntale al asistente')).toBeVisible()
    await expect(panel.getByText('Taza personalizada con nombre y color')).toHaveCount(0)
    await expect(panel.getByText('Buscar con una foto')).toBeVisible()
  })

  test('un payload no se ejecuta y la navegación queda dentro de HotClick', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const buscador = page.getByRole('searchbox', { name: 'Buscar' })
    await buscador.fill(PAYLOAD)
    const panel = page.getByRole('region', { name: 'Buscar en HotClick' })
    await expect(panel.getByText(PAYLOAD, { exact: false })).toBeVisible()
    await expect(panel.locator('img')).toHaveCount(0)
    await expect(panel.locator('script')).toHaveCount(0)

    await buscador.fill('regalo para mi mamá')
    await panel.getByRole('button', { name: /Taza personalizada/ }).click()
    await expect(page).toHaveURL(/\/productos\/1$/)

    await page.goto('/')
    await buscador.fill('regalo para mi mamá')
    await panel.getByRole('button', { name: /Ver el resultado de/ }).click()
    await expect(page).toHaveURL(/\/productos\?search=regalo(%20|\+)para(%20|\+)mi(%20|\+)mam/)
    await expect(page.getByText('Taza personalizada con nombre y color')).toBeVisible()
    await expect(page.getByText('Sérum facial de día')).toHaveCount(0)

    await page.goto('/')
    await buscador.fill('regalo')
    await panel.getByRole('button', { name: /Preguntale al asistente/ }).click()
    await expect(page.getByRole('dialog', { name: 'Asistente HotClick' })).toBeVisible()

    await page.goto('/')
    await buscador.fill('regalo')
    await panel.getByRole('button', { name: /Buscar con una foto/ }).click()
    await expect(page).toHaveURL(/\/buscar\/foto$/)

    await page.goto('/')
    await buscador.fill('regalo')
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })

  test('en móvil el panel de búsqueda activa sigue el mismo recorrido', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Buscá o describí lo que necesitás' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Buscar en HotClick' })
    await dialogo.getByRole('searchbox').fill('regalo para mi mamá')
    await expect(dialogo.getByText('Preguntale al asistente')).toBeVisible()
    await expect(dialogo.getByText('Taza personalizada con nombre y color')).toBeVisible()
    await dialogo.getByRole('button', { name: /Taza personalizada/ }).click()
    await expect(page).toHaveURL(/\/productos\/1$/)
  })

  test('la casilla que rota del asistente se ve como el lugar para escribir', async ({ page }) => {
    await preparar(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const casilla = page.getByRole('button', { name: /regalo a mi pareja|accesorio para mi celular|perro o mi gato|cuidar mi piel|Juguetes para niños/i })
    await expect(casilla).toBeVisible()
    await expect(casilla).toHaveClass(/text-hc-blue-600/)
    await expect(casilla).toHaveClass(/font-semibold/)
  })
})
