import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/** Carrusel del inicio (HANDOFF carrusel-inicio): 3 bloques, puntos, pausa, swipe, alto fijo. APIs mockeadas. */

const prod = (id: number, nombre: string, slug: string, foto = true) => ({
  id, nombreProducto: nombre, precioVenta: 12900, stockActual: 4, categoriaId: 8,
  imagenPrincipalUrl: foto ? `https://example.com/p${id}.jpg` : null,
  categoria: { id: 8, nombreCategoria: 'Hogar' }, empresaNombre: `Tienda ${slug}`, empresaSlug: slug, destacado: true,
})
const CATALOGO = Array.from({ length: 8 }, (_, i) => prod(100 + i, `Catálogo ${i}`, `c${i}`))
const DESTACADOS = [prod(1, 'Jabón de avena y miel', 'jabon'), prod(2, 'Taza de barro', 'barro', false), prod(3, 'Vela', 'vela')]
const NEGOCIOS = [
  { slug: 'jaboneria', nombre: 'Jabonería Monteverde', categoria: 'Cosmética natural', provincia: 'Puntarenas', logoUrl: '', fotoPortada: '' },
  { slug: 'bruma', nombre: 'Bruma Café', categoria: 'Café', provincia: '', logoUrl: '', fotoPortada: 'https://example.com/n2.jpg' },
]

async function mock(page: Page, opts: { destacados?: unknown[]; negocios?: unknown[] | 'error'; catalogo?: unknown[] } = {}) {
  const destacados = opts.destacados ?? DESTACADOS
  const catalogo = opts.catalogo ?? CATALOGO
  await page.route('https://example.com/**', (route) => route.fulfill({ status: 404, body: '' }))
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path.endsWith('/public/negocios/destacados')) {
      return opts.negocios === 'error' ? json(500, { message: 'x' }) : json(200, opts.negocios ?? NEGOCIOS)
    }
    if (path.endsWith('/productos/destacados')) return json(200, { success: true, data: destacados })
    if (/\/productos$/.test(path)) {
      return json(200, { success: true, data: { content: catalogo, totalElements: catalogo.length, totalPages: 1, number: 0, size: 24 } })
    }
    return json(200, { success: true, data: [] })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-mm-v1-off', '1')
  })
}

const carrusel = (page: Page) => page.locator('section[aria-roledescription="carrusel"]')

for (const ancho of [390, 1440]) {
  test(`${ancho}: 3 puntos, alto fijo, controles de 44 px y solo enlaces a tienda/producto`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 })
    await mock(page)
    await page.goto('/')
    const c = carrusel(page)
    await expect(c).toBeVisible()
    await expect(c).toHaveAttribute('aria-label', 'Destacados')
    const tabs = c.getByRole('tab')
    await expect(tabs).toHaveCount(3)
    const alto = async () => (await c.boundingBox())!.height
    const h0 = await alto()
    for (const nombre of ['Negocio destacado', 'Producto destacado']) {
      await c.getByRole('tab', { name: nombre }).click()
      await expect(c.getByRole('group')).toHaveAttribute('aria-label', `${nombre}, 1 de ${nombre.startsWith('Negocio') ? 2 : 3}`)
      expect(Math.abs((await alto()) - h0)).toBeLessThanOrEqual(1)
    }
    for (const b of [...await tabs.all(), c.getByRole('button', { name: /carrusel/ })]) {
      const box = (await b.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
    const cta = c.getByRole('link')
    await expect(cta).toHaveCount(1)
    expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await expect(cta).toHaveAttribute('href', /^\/productos\/\d+$/)
    await expect(c.locator('a[href*="wa.me"], a[href^="tel:"], a[href^="mailto:"]')).toHaveCount(0)
    if (process.env.CARRUSEL_SHOTS) {
      for (const nombre of ['Descubrí', 'Negocio destacado', 'Producto destacado']) {
        await c.getByRole('tab', { name: nombre }).click()
        await c.getByRole('button', { name: /Pausar carrusel/ }).click().catch(() => {})
        await page.mouse.move(0, 0)
        await c.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
        await page.waitForTimeout(400)
        await c.screenshot({ path: `${process.env.CARRUSEL_SHOTS}/carrusel-${ancho}-${nombre.split(' ')[0]}.png`, animations: 'disabled' })
        await c.getByRole('button', { name: /Reanudar carrusel/ }).click().catch(() => {})
      }
    }
  })
}

test('sin foto o con imagen rota: placeholder de marca, nunca un hueco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mock(page)
  await page.goto('/')
  const c = carrusel(page)
  await c.getByRole('tab', { name: 'Negocio destacado' }).click()
  await expect(c.getByRole('img', { name: 'Sin foto todavía' })).toBeVisible()
  await expect(c.getByText('JM')).toBeVisible()
  await expect(c.getByText('Cosmética natural · Puntarenas')).toBeVisible()
})

test('0 destacados: solo Descubrí sin puntos ni pausa; 1 bloque vacío: 2 puntos; error de API: bloque vacío', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mock(page, { destacados: [], negocios: [] })
  await page.goto('/')
  const c = carrusel(page)
  await expect(c.getByText('Deslizá y encontrá algo nuevo')).toBeVisible()
  await expect(c.getByRole('tab')).toHaveCount(0)
  await expect(c.getByRole('button', { name: /carrusel/ })).toHaveCount(0)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await mock(page, { negocios: 'error' })
  await page.goto('/')
  await expect(carrusel(page).getByRole('tab')).toHaveCount(2)
})

test('0 productos en el catálogo: no hay carrusel', async ({ page }) => {
  await mock(page, { destacados: [], negocios: [], catalogo: [] })
  await page.goto('/')
  await page.waitForTimeout(1500)
  await expect(carrusel(page)).toHaveCount(0)
})

test('autoavance de 6 s, pausa con el botón y el texto «Pausado»', async ({ page }) => {
  await page.clock.install()
  await page.setViewportSize({ width: 390, height: 900 })
  await mock(page)
  await page.goto('/')
  const c = carrusel(page)
  await expect(c.getByRole('tab', { name: 'Descubrí' })).toHaveAttribute('aria-selected', 'true')
  await page.mouse.move(0, 0)
  await page.clock.runFor(5500)
  await expect(c.getByRole('tab', { name: 'Descubrí' })).toHaveAttribute('aria-selected', 'true')
  await page.clock.runFor(1000)
  await expect(c.getByRole('tab', { name: 'Negocio destacado' })).toHaveAttribute('aria-selected', 'true')
  await expect(c.locator('[aria-live]')).toHaveAttribute('aria-live', 'off')
  await c.getByRole('button', { name: 'Pausar carrusel' }).click()
  await expect(c.getByText('Pausado · Negocio 1 de 2')).toBeVisible()
  await c.getByRole('button', { name: 'Reanudar carrusel' }).blur()
  await page.mouse.move(0, 0)
  await page.clock.runFor(20_000)
  await expect(c.getByText('Pausado · Negocio 1 de 2')).toBeVisible()
})

test('teclado ←/→ y swipe cambian de elemento', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mock(page)
  await page.goto('/')
  const c = carrusel(page)
  await c.getByRole('tab', { name: 'Descubrí' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(c.getByRole('group')).toHaveAttribute('aria-label', 'Negocio destacado, 1 de 2')
  await expect(c.locator('[aria-live]')).toHaveAttribute('aria-live', 'polite')
  await page.keyboard.press('ArrowLeft')
  await expect(c.getByRole('group')).toHaveAttribute('aria-label', 'Descubrí')
  const box = (await c.boundingBox())!
  const y = box.y + 80
  await c.dispatchEvent('pointerdown', { clientX: box.x + 300, clientY: y, pointerType: 'touch', isPrimary: true })
  await c.dispatchEvent('pointerup', { clientX: box.x + 200, clientY: y + 5, pointerType: 'touch', isPrimary: true })
  await expect(c.getByRole('group')).toHaveAttribute('aria-label', 'Negocio destacado, 1 de 2')
  await expect(c).toHaveCSS('touch-action', 'pan-y')
})

test('prefers-reduced-motion: no avanza solo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await mock(page)
  await page.goto('/')
  const c = carrusel(page)
  await page.mouse.move(0, 0)
  await page.clock.runFor(15_000)
  await expect(c.getByRole('tab', { name: 'Descubrí' })).toHaveAttribute('aria-selected', 'true')
})

for (const ancho of [390, 1440]) {
  test(`${ancho}: correcciones de Diseño — contadores, Descubrí sin «SIN FOTO», CTA en 1 línea, texto ≤ 2 líneas, etiqueta visible`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 })
    await mock(page)
    await page.goto('/')
    const c = carrusel(page)
    await expect(c).toBeVisible()
    const barra = c.locator('p.text-center')
    // Descubrí: sin contador; ilustración de marca (las fotos de example.com fallan) y nunca «SIN FOTO».
    await expect(barra).toHaveText('')
    await expect(c.getByTestId('carrusel-ilustracion-marca')).toBeVisible()
    await expect(c.getByText(/SIN FOTO/)).toHaveCount(0)
    const cta = c.getByRole('link', { name: /Empezar a descubrir/ })
    expect((await cta.boundingBox())!.height).toBeLessThanOrEqual(46)
    const detalle = c.getByText('Productos de emprendedores de todo el país, uno por uno.')
    const lineas = await detalle.evaluate((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)))
    expect(lineas).toBeLessThanOrEqual(2)
    const titulo = c.getByRole('heading')
    const lt = await titulo.evaluate((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)))
    expect(lt).toBeLessThanOrEqual(2)
    expect(lineas + lt).toBeGreaterThan(0)
    // Negocio y Producto: «Negocio 1 de 2» y «Producto 1 de 3»; el placeholder dice solo «SIN FOTO».
    await c.getByRole('tab', { name: 'Negocio destacado' }).click()
    await expect(barra).toHaveText('Negocio 1 de 2')
    await expect(c.getByText('SIN FOTO', { exact: true })).toBeVisible()
    await c.getByRole('tab', { name: 'Producto destacado' }).click()
    await expect(barra).toHaveText('Producto 1 de 3')
    // La etiqueta no queda tapada por el header fijo (chips) al llevar el carrusel a la vista.
    await c.getByRole('tab', { name: 'Descubrí' }).click()
    await c.evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await page.waitForTimeout(400)
    const eb = (await c.getByText('Descubrí', { exact: true }).first().boundingBox())!
    const libre = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('section[aria-roledescription="carrusel"]'), { x: eb.x + 4, y: eb.y + eb.height / 2 })
    expect(libre).toBeTruthy()
    if (ancho === 1440) console.log('ANCHO_CARRUSEL', (await c.boundingBox())!.width, 'COLUMNA', await c.evaluate((e) => e.parentElement!.getBoundingClientRect().width), 'MAIN', await page.evaluate(() => document.querySelector('main')?.getBoundingClientRect().width))
  })
}
