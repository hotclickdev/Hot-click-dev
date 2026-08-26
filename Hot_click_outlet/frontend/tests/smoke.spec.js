import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json')
const MARKER_FILE = path.join(__dirname, '.auth', 'credentials.json')

const CONSOLE_ALLOWLIST = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /\[vite\] hot updated/i,
  /Failed to load resource:.*favicon/i,
  // Backend/API caído o proxy local — no es excepción JS de la app
  /Failed to load resource: net::ERR_/i,
  /Failed to load resource: the server responded with a status of 4\d\d/i,
]

/**
 * @param {import('@playwright/test').Page} page
 */
function attachGuards(page) {
  const pageErrors = []
  const consoleErrors = []
  const api500 = []

  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (CONSOLE_ALLOWLIST.some((re) => re.test(text))) return
    consoleErrors.push(text)
  })

  page.on('response', (res) => {
    const url = res.url()
    if (!url.includes('/api/')) return
    if (res.status() >= 500) {
      api500.push(`${res.status()} ${url}`)
    }
  })

  return {
    assertClean() {
      expect(pageErrors, `pageerror: ${pageErrors.join(' | ')}`).toEqual([])
      expect(consoleErrors, `console.error: ${consoleErrors.join(' | ')}`).toEqual([])
      expect(api500, `API 5xx: ${api500.join(' | ')}`).toEqual([])
    },
  }
}

async function assertNotBlank(page) {
  await expect(page.locator('#root')).toBeVisible()
  const text = await page.locator('body').innerText()
  expect(text.trim().length, 'pantalla en blanco (sin texto)').toBeGreaterThan(5)
}

function hasAdminCredentials() {
  try {
    const raw = fs.readFileSync(MARKER_FILE, 'utf8')
    return JSON.parse(raw).hasCredentials === true
  } catch {
    return false
  }
}

test.describe('Smoke público', () => {
  test('Home / carga sin errores graves', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    await expect(page.locator('body')).toContainText(/HotClick|marketplace|productos/i)
    await page.waitForTimeout(800)
    guards.assertClean()
  })

  test('Catálogo /productos renderiza UI', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    // Filtros, grid, empty o loading — algo de UI de catálogo
    const ui = page.locator('main, [class*="catalog"], button, input, a').first()
    await expect(ui).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(800)
    guards.assertClean()
  })

  test('Carrito /carrito renderiza UI', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    await expect(page.locator('main, h1, h2, button').first()).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(500)
    guards.assertClean()
  })

  test('Emprender abre hub /emprende, no el directorio', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Emprender' }).first().waitFor()
    await page.getByRole('navigation').getByRole('link', { name: 'Emprender' }).click()
    await expect(page).toHaveURL(/\/emprende$/)
    await expect(page.getByRole('heading', { name: /Crecé tu negocio|Grow your business|Cresça seu negócio/ })).toBeVisible()
    await page.getByRole('link', { name: /Crear mi negocio|Create my business|Criar meu negócio/ }).first().click()
    await expect(page).toHaveURL(/\/registro-empresa/)
    await page.goto('/emprendimientos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Aliados' })).toBeVisible()
    await page.goto('/esta-ruta-no-existe-p0', { waitUntil: 'domcontentloaded' })
    await page.getByText(/Crecer con HotClick|Grow with HotClick|Crescer com HotClick/).click()
    await expect(page).toHaveURL(/\/emprende$/)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Menú' }).click()
    await page.locator('.hc-mobile-menu a[href="/emprende"]').click()
    await expect(page).toHaveURL(/\/emprende$/)
    guards.assertClean()
  })

  test('Checkout /checkout renderiza UI', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    // Carrito vacío (estado típico en smoke) o formulario de checkout
    const emptyOrForm = page
      .getByText(/carrito está vacío|seguir comprando|continuar comprando|resumen|método de pago/i)
      .or(page.locator('form'))
      .first()
    await expect(emptyOrForm).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(800)
    guards.assertClean()
  })
})

test.describe('Smoke admin', () => {
  test.use({
    storageState: hasAdminCredentials() ? AUTH_FILE : undefined,
  })

  test.beforeEach(() => {
    test.skip(!hasAdminCredentials(), 'Definí E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD')
  })

  test('Admin productos /admin/productos', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/admin/productos', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(
      page.getByRole('heading').or(page.locator('table, [class*="Product"], button')).first(),
    ).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1000)
    guards.assertClean()
  })

  test('Wizard nuevo producto /admin/nuevo-producto', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/admin/nuevo-producto', { waitUntil: 'domcontentloaded' })
    await assertNotBlank(page)
    await expect(page).not.toHaveURL(/\/login/)
    // Paso fotos / progreso del wizard
    await expect(
      page.locator('button, input[type="file"], [class*="Wizard"], [class*="Photo"], h1, h2').first(),
    ).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(1000)
    guards.assertClean()
  })
})
