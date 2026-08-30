import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json')
const MARKER_FILE = path.join(__dirname, '.auth', 'credentials.json')

const CONSOLE_ALLOWLIST = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /\[vite\] hot updated/i,
  /\[vite\] Failed to reload/i,
  /Failed to load resource:.*favicon/i,
  // Backend/API caído o proxy local — no es excepción JS de la app
  /Failed to load resource: net::ERR_/i,
  /Failed to load resource: the server responded with a status of [45]\d\d/i,
  /AxiosError/i,
  /\[useBranding\]/i,
  /\[AppChrome\]/i,
  /\[catalogoVisitante\]/i,
  /\[productoVisitante\]/i,
  /\[EmprendimientosPage\]/i,
  /\[useHeroRotator\]/i,
  /\[ConveniosMarquee\]/i,
]

function attachGuards(page: Page) {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const api500: string[] = []

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
    // 502 = Vite proxy sin backend; no es un 500 de la app
    if (res.status() >= 500 && res.status() !== 502) {
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

async function assertNotBlank(page: Page) {
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.locator('#root')).toContainText(/\S.{4,}/, { timeout: 20_000 })
}

async function assertSinSkusMock(page: Page) {
  await expect(page.locator('body')).not.toContainText('Auriculares Bluetooth X200')
  await expect(page.locator('body')).not.toContainText('Cojín Decorativo XL')
}

async function cerrarOverlays(page: Page) {
  const esenciales = page.getByRole('button', { name: /solo esenciales/i })
  if (await esenciales.isVisible({ timeout: 2500 }).catch(() => false)) {
    await esenciales.click()
  }
  await cerrarBienvenida(page, 1_500)
}

/** El cupón de bienvenida aparece con delay y tapa el catálogo. */
async function cerrarBienvenida(page: Page, timeoutMs: number) {
  const dialog = page.getByRole('dialog', { name: /bienvenido a hotclick/i })
  if (!(await dialog.isVisible({ timeout: timeoutMs }).catch(() => false))) return
  await dialog.getByRole('button', { name: /no gracias/i }).click()
  await expect(dialog).toBeHidden()
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
  test('Admin sin sesión conserva redirect en login', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login\?redirect=/)
    expect(decodeURIComponent(page.url())).toMatch(/\/admin\/usuarios/)
    guards.assertClean()
  })

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
    await cerrarOverlays(page)
    await assertNotBlank(page)
    await expect(
      page.getByText(/Catálogo|Cargando productos|No se encontraron productos|Emprendimientos|Buscar productos|Shop/i).first(),
    ).toBeVisible({ timeout: 20_000 })
    await assertSinSkusMock(page)
    guards.assertClean()
  })

  test('Catálogo con stock permite agregar al carrito y abrir checkout', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    const vacio = page.getByText('No se encontraron productos')
    const cafe = page.getByRole('heading', { name: 'Café de especialidad 250g' })
    await expect(vacio.or(cafe).or(page.getByRole('heading', { level: 3 })).first()).toBeVisible({ timeout: 20_000 })
    if (await vacio.isVisible().catch(() => false)) {
      test.skip(true, 'Catálogo vacío: levantá el API H2 con hotclick.seed.catalogo-local=true')
    }
    await cerrarBienvenida(page, 8_000)
    const nombreEl = (await cafe.isVisible().catch(() => false))
      ? cafe
      : page.getByRole('heading', { level: 3 }).first()
    const nombre = (await nombreEl.textContent())?.trim() ?? ''
    expect(nombre.length).toBeGreaterThan(2)
    await assertSinSkusMock(page)
    await nombreEl.click()
    await expect(page).toHaveURL(/\/productos\/\d+/)
    await page.getByRole('button', { name: /Agregar al pedido|Agregar al carrito|Añadir/i }).first().click()
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(page.getByText(nombre, { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Continuar a datos y pago|Continue to details|Continuar para dados/i }).click()
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText(nombre, { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    guards.assertClean()
  })

  test('Prototipo visitante shop no vende SKUs mock', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/prototipo/visitante/shop', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await assertNotBlank(page)
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText(/Cargando productos|Catálogo no disponible|No encontramos productos|₡/i).first(),
    ).toBeVisible({ timeout: 20_000 })
    await assertSinSkusMock(page)
    guards.assertClean()
  })

  test('Prototipo discover, negocio y favoritos no venden SKUs mock', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/prototipo/visitante/discover', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByText(/Cargando productos|Catálogo no disponible|No hay productos para descubrir|Café de especialidad/i).first(),
    ).toBeVisible({ timeout: 20_000 })
    await assertSinSkusMock(page)

    await page.goto('/prototipo/visitante/negocio/qa2', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(
      page.getByText(/Cargando tienda|Tienda no disponible|Negocio no encontrado/i).first(),
    ).toBeVisible({ timeout: 20_000 })
    await assertSinSkusMock(page)

    await page.goto('/prototipo/visitante/favoritos', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible({ timeout: 20_000 })
    await assertSinSkusMock(page)
    guards.assertClean()
  })

  test('Prototipo checkout y confirmación van al pago real', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/prototipo/visitante/checkout', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/checkout/)
    await page.goto('/prototipo/visitante/compra-confirmada', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pago\/exito/)
    await expect(page.locator('body')).not.toContainText(/pedido\s*#4021/i)
    await expect(page.getByRole('heading', { name: 'Pago no completado' })).toBeVisible({ timeout: 20_000 })
    await page.goto('/prototipo/visitante/pago-fallido', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pago\/cancelado/)
    guards.assertClean()
  })

  test('Prototipo visitante no finge carrito, pedidos ni conteos', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/prototipo/visitante', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(page.getByRole('heading', { name: /Qué estás buscando hoy/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('body')).not.toContainText('Ver 7 productos')
    await expect(page.locator('body')).not.toContainText('Tenés productos en el carrito')
    await assertSinSkusMock(page)

    await page.goto('/prototipo/visitante/notificaciones', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('body')).not.toContainText(/pedido\s*#4021/i)
    await assertSinSkusMock(page)

    await page.goto('/prototipo/visitante/asistente', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/productos\?ai=1/)
    await assertSinSkusMock(page)
    guards.assertClean()
  })

  test('Prototipo vendedor no confirma SKUs mock', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/prototipo/emprendedor/tienda/compra-confirmada', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pago\/exito/)
    await expect(page.locator('body')).not.toContainText(/pedido\s*#4021/i)
    await assertSinSkusMock(page)
    await page.goto('/prototipo/pyme/compra-ok', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pago\/exito/)
    await assertSinSkusMock(page)
    await page.goto('/prototipo/emprendedor/tienda/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/carrito/)
    guards.assertClean()
  })

  test('Carrito /carrito renderiza UI', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await assertNotBlank(page)
    await expect(page.getByRole('heading', { name: /Tu pedido está vacío|Tu carrito/i })).toBeVisible({ timeout: 15_000 })
    guards.assertClean()
  })

  test('Emprender abre hub /emprende, no el directorio', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Emprender' }).first().click()
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
    await page.getByRole('link', { name: 'Emprender' }).first().click()
    await expect(page).toHaveURL(/\/emprende$/)
    guards.assertClean()
  })

  test('Pago /pago/exito no muestra la maqueta #4021', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/pago/exito', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
    await expect(page.locator('body')).not.toContainText(/pedido\s*#4021/i)
    await expect(page.getByRole('heading', { name: 'Pago no completado' })).toBeVisible({ timeout: 20_000 })
    guards.assertClean()
  })

  test('Checkout /checkout renderiza UI', async ({ page }) => {
    const guards = attachGuards(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await cerrarOverlays(page)
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
