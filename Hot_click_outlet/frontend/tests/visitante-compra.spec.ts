import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const VISITANTE = '/visitante'

function pathnameDe(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return ''
  }
}

/** Bare marketplace checkout — Visitante must never land here mid-flow. */
function esCheckoutBare(url: string): boolean {
  const path = pathnameDe(url)
  return path === '/checkout' || path.startsWith('/checkout/')
}

function esRutaVisitante(url: string): boolean {
  const path = pathnameDe(url)
  return path === VISITANTE || path.startsWith(`${VISITANTE}/`)
}

async function silenciarOverlays(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'hotclick-cookie-consent',
      JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }),
    )
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

/** Seed cart so carrito→checkout works without live catalog stock. */
async function seedCarrito(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'hotclick-cart',
      JSON.stringify({
        state: {
          items: [{ id: 1, nombre: 'Mouse Visitante', precio: 5000, cantidad: 1, stock: 4 }],
          cartUpdatedAt: Date.now(),
        },
        version: 0,
      }),
    )
  })
}

/** No live Stripe / guest-checkout side effects even if Pagá is clicked. */
async function bloquearPagoSideEffects(page: Page) {
  const cumplir = async (route: Route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E smoke: pago no iniciado' }),
    })
  }
  await page.route('**/api/payments/**', cumplir)
  await page.route('**/api/**/guest-checkout**', cumplir)
  await page.route('**/api/sinpe/**', cumplir)
}

function watchBareCheckoutDump(page: Page): () => void {
  const dumps: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return
    if (esCheckoutBare(frame.url())) dumps.push(frame.url())
  })
  return () => {
    expect(dumps, `SPA dumped to bare /checkout: ${dumps.join(', ')}`).toEqual([])
  }
}

test.describe('Visitante — compra smoke (prefijo /visitante)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('shop → carrito → checkout se quedan en /visitante/*', async ({ page }) => {
    await silenciarOverlays(page)
    await seedCarrito(page)
    await bloquearPagoSideEffects(page)
    const assertNoDump = watchBareCheckoutDump(page)

    await page.goto(`${VISITANTE}/shop`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/visitante\/shop/)
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible({ timeout: 20_000 })

    const productoLink = page.locator('a[href*="/visitante/producto/"]').first()
    const hayProductos = await productoLink.isVisible().catch(() => false)

    if (hayProductos) {
      await productoLink.click()
      await expect(page).toHaveURL(/\/visitante\/producto\//)
      const agregar = page.getByRole('button', { name: /Agregar al carrito/i })
      if (await agregar.isEnabled().catch(() => false)) {
        await agregar.click()
        await expect(page).toHaveURL(/\/visitante\/carrito/)
      } else {
        await page.goto(`${VISITANTE}/carrito`, { waitUntil: 'domcontentloaded' })
      }
    } else {
      await page.goto(`${VISITANTE}/carrito`, { waitUntil: 'domcontentloaded' })
    }

    await expect(page).toHaveURL(/\/visitante\/carrito/)
    await expect(page.getByRole('heading', { name: /Tu carrito/i })).toBeVisible()
    await expect(page.getByRole('listitem').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Ir a pagar/i })).toBeVisible()

    await page.getByRole('link', { name: /Ir a pagar/i }).click()
    await expect(page).toHaveURL(/\/visitante\/checkout/)
    expect(esRutaVisitante(page.url())).toBe(true)
    expect(esCheckoutBare(page.url())).toBe(false)

    await expect(page.getByText('SINPE Móvil')).toBeVisible({ timeout: 20_000 })

    const volver = page.getByRole('link', { name: /Volver al pedido/i })
    await expect(volver).toBeVisible()
    await expect(volver).toHaveAttribute('href', /\/visitante\/carrito/)

    assertNoDump()
  })

  test('deep-link /visitante/checkout no redirige a /checkout bare', async ({ page }) => {
    await silenciarOverlays(page)
    await seedCarrito(page)
    await bloquearPagoSideEffects(page)
    const assertNoDump = watchBareCheckoutDump(page)

    await page.goto(`${VISITANTE}/checkout`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/visitante\/checkout/)
    expect(esCheckoutBare(page.url())).toBe(false)
    await expect(page.getByText('SINPE Móvil')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Mouse Visitante')).toBeVisible()
    assertNoDump()
  })

  test('cuenta anónima ofrece login; login renderiza (backend opcional)', async ({ page }) => {
    await silenciarOverlays(page)
    await page.goto(`${VISITANTE}/cuenta`, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/visitante\/cuenta/)

    const login = page.getByRole('link', { name: /Iniciar sesión/i })
    await expect(login).toBeVisible()
    await login.click()
    await expect(page).toHaveURL(/\/login/)

    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('textbox', { name: /Correo electrónico/i })).toBeVisible()
  })
})
