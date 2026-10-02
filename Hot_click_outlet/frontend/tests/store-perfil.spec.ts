import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const EMPRESA = {
  slug: 'casa-luna',
  nombreComercial: 'Casa Luna 506',
  colorPrimario: '#E73B33',
  colorSecundario: '#134E4A',
  colorAcento: '#0F766E',
  tagline: 'Hogar y accesorios hechos con cariño en San José',
  whatsapp: '50688887777',
  instagram: '@casaluna506',
  zonaEnvio: 'todo el país',
  descripcion: 'Somos un taller familiar en San José.',
  categoriaNegocio: 'Hogar y accesorios',
  enHotclickDesde: '2026-09-14',
  facturaElectronica: true,
  retiro: { provincia: 'San José', canton: 'San José', direccion: 'Barrio Escalante', horarioApertura: '09:00:00', horarioCierre: '18:00:00' },
}

const PRODUCTOS = [
  { id: 1, nombre: 'Bolso personalizado', precio: 7900, stock: 5 },
  { id: 2, nombre: 'Taza con nombre', precio: 11000, stock: 5 },
]

async function simularApi(page: Page, { convenios = [] as unknown[] } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/tienda/casa-luna'
      ? EMPRESA
      : path.endsWith('/productos')
        ? { content: PRODUCTOS, totalPages: 1, totalElements: 2 }
        : path.endsWith('/categorias')
          ? [{ id: 1, nombreCategoria: 'Hogar' }]
          : path === '/api/convenios/publicos'
            ? convenios
            : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
}

test.describe('STORE — perfil del negocio', () => {
  test('móvil: portada con atrás y compartir, datos, acciones y "Cómo comprarle"', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tienda/casa-luna', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Casa Luna 506' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Compartir Casa Luna 506' })).toBeVisible()
    await expect(page.getByText('En HotClick desde sept. 2026')).toBeVisible()
    await expect(page.getByText('Emite factura electrónica')).toBeVisible()
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/50688887777/)
    await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/casaluna506')
    await expect(page.getByRole('heading', { name: 'Productos (2)' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cómo comprarle' })).toBeVisible()
    await expect(page.getByText('Retiro en tienda · San José')).toBeVisible()
    await expect(page.getByText('9:00 a 18:00')).toBeVisible()
    // La portada ocupa el lugar del header en el perfil móvil.
    await expect(page.getByRole('banner')).toBeHidden()
  })

  test('escritorio: conserva el header de la tienda y muestra el catálogo', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/tienda/casa-luna', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pedido de esta tienda' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Agregar al pedido: Bolso personalizado/ })).toBeVisible()
  })

  test('agregar suma al pedido de la tienda y las subrutas conservan el header en móvil', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tienda/casa-luna', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Agregar al pedido: Taza con nombre/ }).click()
    await expect(page.getByRole('button', { name: /Agregado al pedido: Taza con nombre/ })).toBeVisible()

    await page.goto('/tienda/casa-luna/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('el buscador y el filtro por categoría consultan el catálogo de la tienda', async ({ page }) => {
    await simularApi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tienda/casa-luna', { waitUntil: 'domcontentloaded' })

    const consulta = page.waitForRequest((r) => r.url().includes('/api/tienda/casa-luna/productos') && r.url().includes('q=taza'))
    await page.getByRole('searchbox', { name: 'Buscar en Casa Luna 506' }).fill('taza')
    await page.keyboard.press('Enter')
    await consulta

    const porCategoria = page.waitForRequest((r) => r.url().includes('categoriaId=1'))
    await page.getByRole('button', { name: 'Hogar' }).click()
    await porCategoria
  })
})

test.describe('STORE — directorio de emprendimientos', () => {
  const CONVENIOS = [
    { id: 1, nombre: 'Casa Luna 506', descripcion: 'Hogar y accesorios', urlWeb: 'https://casaluna.example' },
    { id: 2, nombre: 'Bruma Café', descripcion: 'Café y estilo de vida', urlWeb: null },
  ]

  test('móvil: título, buscador, conteo y tarjetas con sus enlaces', async ({ page }) => {
    await simularApi(page, { convenios: CONVENIOS })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/emprendimientos', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { level: 1, name: 'Emprendimientos' })).toBeVisible()
    await expect(page.getByText('2 negocios')).toBeVisible()
    await expect(page.getByRole('link', { name: /Casa Luna 506: sitio externo/ })).toHaveAttribute('href', 'https://casaluna.example')

    await page.getByRole('searchbox', { name: 'Buscar un negocio' }).fill('bruma')
    await expect(page.getByText('1 negocio', { exact: true })).toBeVisible()
    await expect(page.getByText('Casa Luna 506')).toHaveCount(0)
  })

  test('sin convenios muestra el estado vacío', async ({ page }) => {
    await simularApi(page, { convenios: [] })
    await page.goto('/emprendimientos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Próximamente')).toBeVisible()
  })
})
