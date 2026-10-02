import { test, type Page, type Route } from '@playwright/test'

/**
 * Capturas de las pantallas STORE para compararlas contra Figma. Solo corre con STORE_SHOTS=<carpeta>;
 * sin esa variable se omite (no es una prueba funcional).
 */
const SALIDA = process.env.STORE_SHOTS
test.skip(!SALIDA, 'Solo captura cuando STORE_SHOTS apunta a una carpeta')
test.use(process.env.CI ? {} : { channel: 'chrome' })

const color = (c: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${c}"/></svg>`)}`

const EMPRESA = {
  slug: 'casa-luna', nombreComercial: 'Casa Luna 506', colorPrimario: '#E73B33',
  tagline: 'Hogar y accesorios hechos con cariño en San José', whatsapp: '50688887777', instagram: '@casaluna506',
  zonaEnvio: 'todo el país', descripcion: 'Somos un taller familiar en San José. Hacemos piezas de hogar y accesorios a mano, con materiales locales y entregas en todo el país.',
  categoriaNegocio: 'Hogar y accesorios', enHotclickDesde: '2026-09-14', facturaElectronica: true,
  retiro: { provincia: 'San José', canton: 'San José', direccion: 'Barrio Escalante', horarioApertura: '09:00:00', horarioCierre: '18:00:00' },
}
const PRODUCTOS = [
  { id: 1, nombre: 'Sofá de sala dos plazas', precio: 17500, stock: 12, imagenUrl: color('#9bb7a3') },
  { id: 2, nombre: 'Taza personalizada con nombre y color', precio: 11000, stock: 8, imagenUrl: color('#e5e7eb') },
  { id: 3, nombre: 'Bolso personalizado en color y grabado', precio: 7900, stock: 5, imagenUrl: color('#1f2937') },
  { id: 4, nombre: 'Lámpara de mesa nórdica', precio: 15000, stock: 4, imagenUrl: color('#fde68a') },
  { id: 5, nombre: 'Cama y correa para perro', precio: 21000, stock: 9, imagenUrl: color('#a5b4c8') },
  { id: 6, nombre: 'Set de brochas de maquillaje', precio: 2500, stock: 20, imagenUrl: color('#fbcfe8') },
]
const CONVENIOS = [
  { id: 1, nombre: 'Casa Luna 506', descripcion: 'Hogar y accesorios hechos con cariño', urlWeb: 'https://casaluna.cr', logoUrl: '' },
  { id: 2, nombre: 'Bruma Café', descripcion: 'Café de especialidad y repostería', urlWeb: '', logoUrl: '' },
  { id: 3, nombre: 'Taller Ceiba', descripcion: 'Muebles de madera para niños', urlWeb: 'https://ceiba.cr', logoUrl: '' },
]

async function simular(page: Page, empresa: Record<string, unknown>) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.route('**/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/tienda/casa-luna' ? empresa
      : path.endsWith('/productos') ? { content: PRODUCTOS, totalPages: 1, totalElements: PRODUCTOS.length }
      : path.endsWith('/categorias') ? [{ id: 1, nombreCategoria: 'Hogar' }, { id: 2, nombreCategoria: 'Accesorios' }]
      : path === '/api/convenios/publicos' ? CONVENIOS : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
}

async function ir(page: Page, ruta: string, nombre: string, ancho: number, alto: number) {
  await page.setViewportSize({ width: ancho, height: alto })
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true })
}

test('capturas STORE', async ({ page }) => {
  await simular(page, EMPRESA)
  await ir(page, '/tienda/casa-luna', 'perfil-movil', 390, 844)
  await ir(page, '/tienda/casa-luna', 'perfil-desktop', 1440, 900)
  await ir(page, '/emprendimientos', 'directorio-movil', 390, 844)
  await simular(page, { ...EMPRESA, colorSecundario: '#134E4A', colorAcento: '#0F766E' })
  await ir(page, '/tienda/casa-luna', 'color-movil', 390, 844)
})
