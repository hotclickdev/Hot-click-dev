import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function mockApis(page: Page, contador: { llamadas: number }) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/public/shopping-assistant/search-by-image') {
      contador.llamadas += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          analisis: { etiquetaPrincipal: 'Taza', categoria: 'Hogar' },
          encontrado: true,
          productos: [{ id: 285, nombre: 'Taza de ejemplo', precio: 11000, imagenUrl: null, similarity: 94, empresaNombre: 'Tienda de ejemplo', categoria: 'Hogar' }],
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
}

test.describe('Buscar con una foto', () => {
  test('móvil: explica qué hace, con pasos, consejos, privacidad y los dos botones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApis(page, { llamadas: 0 })
    await page.goto('/buscar/foto', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Buscá con una foto' })).toBeVisible()
    for (const paso of ['Sacá o subí una foto', 'Analizamos el producto', 'Te mostramos opciones parecidas']) {
      await expect(page.getByText(paso, { exact: true })).toBeVisible()
    }
    await expect(page.getByText('Para mejores resultados')).toBeVisible()
    await expect(page.getByText(/La foto de la búsqueda no se guarda/)).toBeVisible()
    const tomar = page.getByRole('button', { name: 'Tomar foto' })
    await expect(tomar).toBeVisible()
    expect((await tomar.boundingBox())?.height).toBe(48)
    await expect(page.getByRole('button', { name: 'Galería' })).toBeVisible()
  })

  test('escritorio: explicación al costado, elegir foto y explorar el catálogo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const contador = { llamadas: 0 }
    await mockApis(page, contador)
    await page.goto('/buscar/foto', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Buscá con una foto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Elegir una foto' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar el catálogo' })).toHaveAttribute('href', '/productos')
    const zona = await page.getByRole('button', { name: /Arrastrá una foto/ }).boundingBox()
    const pasos = await page.getByRole('heading', { name: 'Así funciona' }).boundingBox()
    expect(pasos!.x).toBeGreaterThan(zona!.x + zona!.width)

    await page.locator('input[type=file]').last().setInputFiles({ name: 'taza.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('heading', { name: 'Parecidos en HotClick' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Taza de ejemplo/ })).toHaveAttribute('href', '/productos/285')
    expect(contador.llamadas).toBe(1)
  })

  test('avisa sin llamar al servidor si el archivo no es una imagen compatible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const contador = { llamadas: 0 }
    await mockApis(page, contador)
    await page.goto('/buscar/foto', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type=file]').last().setInputFiles({ name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
    await expect(page.getByText(/no es una imagen compatible/)).toBeVisible()
    expect(contador.llamadas).toBe(0)
  })

  test('sin coincidencias manda la solicitud en la misma página', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    })
    let servicios = 0
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/public/shopping-assistant/search-by-image') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ analisis: { etiquetaPrincipal: 'Reloj', categoria: 'Accesorios' }, encontrado: false, productos: [] }),
        })
        return
      }
      if (url.pathname === '/api/servicios/fotos') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { url: 'https://cdn.example/foto.jpg' } }) })
        return
      }
      if (url.pathname === '/api/servicios' && route.request().method() === 'POST') {
        servicios += 1
        const body = route.request().postDataJSON() as { descripcion?: string; fotosUrls?: string; telefonoContacto?: string }
        expect(body.descripcion).toContain('[Búsqueda por foto]')
        expect(body.descripcion).toContain('Reloj')
        expect(body.fotosUrls).toContain('https://cdn.example/foto.jpg')
        expect(body.telefonoContacto).toBe('+50688888888')
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    })

    await page.goto('/buscar/foto', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type=file]').last().setInputFiles({ name: 'reloj.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('heading', { name: '¿Mandamos una solicitud para buscarlo?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sí, mandar solicitud' })).toBeDisabled()
    await page.getByLabel('Teléfono').fill('8888 8888')
    await page.getByRole('button', { name: 'Sí, mandar solicitud' }).click()
    await expect(page.getByText('Listo. Ya mandamos la solicitud.')).toBeVisible()
    await expect(page).toHaveURL(/\/buscar\/foto$/)
    expect(servicios).toBe(1)
    await expect(page.getByRole('link', { name: 'Ver mis solicitudes' })).toHaveCount(0)
  })

  test('si el parecido no es el producto, la solicitud también sale desde acá', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    let servicios = 0
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/public/shopping-assistant/search-by-image') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            analisis: { etiquetaPrincipal: 'Taza', categoria: 'Hogar' },
            encontrado: true,
            productos: [{ id: 285, nombre: 'Taza de ejemplo', precio: 11000, imagenUrl: null, similarity: 94, empresaNombre: 'Tienda de ejemplo', categoria: 'Hogar' }],
          }),
        })
        return
      }
      if (url.pathname === '/api/servicios/fotos') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { url: 'https://cdn.example/taza.jpg' } }) })
        return
      }
      if (url.pathname === '/api/servicios' && route.request().method() === 'POST') {
        servicios += 1
        const body = route.request().postDataJSON() as { descripcion?: string; telefonoContacto?: string }
        expect(body.descripcion).toContain('Las opciones parecidas no eran el producto')
        expect(body.telefonoContacto).toBe('+50688888888')
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 2 } }) })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
    })

    await page.goto('/buscar/foto', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type=file]').last().setInputFiles({ name: 'taza.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('heading', { name: '¿Este es el producto que buscabas?' })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, es este' }).click()
    await expect(page.getByText('Dale. Abrí el que te sirva.')).toBeVisible()
    await expect(page).toHaveURL(/\/buscar\/foto/)

    await page.locator('input[type=file]').last().setInputFiles({ name: 'taza.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('button', { name: 'No es este' }).click()
    await expect(page.getByRole('heading', { name: '¿Mandamos una solicitud para encontrarlo?' })).toBeVisible()
    await page.getByLabel('Teléfono').fill('8888 8888')
    await page.getByRole('button', { name: 'Sí, mandar solicitud' }).click()
    await expect(page.getByText('Listo. Ya mandamos la solicitud.')).toBeVisible()
    await expect(page).toHaveURL(/\/buscar\/foto/)
    expect(servicios).toBe(1)
  })
})
