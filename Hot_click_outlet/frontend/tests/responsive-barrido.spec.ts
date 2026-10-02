import { test, expect, type Page } from '@playwright/test'
import { sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/** P15 (responsive): barrido compacto del comprador a 390 y 1440 con la API simulada. */
const RUTAS = [
  '/', '/productos', '/productos/1', '/categorias', '/carrito', '/checkout', '/servicios',
  '/tienda/demo', '/tienda/demo/producto/1', '/envios', '/login', '/registro', '/404', '/wishlist',
]
const ANCHOS = [390, 1440]

const producto = (id: number, nombre: string, precio: number) => ({
  id, nombre, nombreProducto: nombre, precio, precioVenta: precio, stock: 8, stockActual: 8,
  imagenUrl: null, empresaNombre: 'Casa Luna 506', empresaSlug: 'demo', descripcion: 'Hecho a mano en San Jos\u00e9.',
})
const PRODUCTOS = [producto(1, 'Taza personalizada con nombre', 7900), producto(2, 'Bolso de cuero caf\u00e9', 24500), producto(3, 'Sill\u00f3n de sala verde', 32000)]
const EMPRESA = { slug: 'demo', nombreComercial: 'Casa Luna 506', tagline: 'Hogar y accesorios', whatsapp: '50688887777', zonaEnvio: 'todo el pa\u00eds' }
const CATEGORIAS = [{ id: 1, nombreCategoria: 'Hogar', nombre: 'Hogar' }, { id: 2, nombreCategoria: 'Accesorios', nombre: 'Accesorios' }]

function datosDe(path: string): unknown {
  if (path === '/api/tienda/demo') return EMPRESA
  if (/\/productos\/\d+$/.test(path)) return PRODUCTOS[0]
  if (path.endsWith('/productos')) return { content: PRODUCTOS, totalElements: 3, totalPages: 1, number: 0, size: 20 }
  if (path.endsWith('/categorias')) return CATEGORIAS
  return []
}

async function simularApi(page: Page) {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ success: true, data: datosDe(new URL(route.request().url()).pathname) }),
  }))
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    const item = { id: 1, nombre: 'Taza personalizada con nombre', precio: 7900, cantidad: 2, stock: 8, empresaNombre: 'Casa Luna 506', empresaId: 3 }
    localStorage.setItem('hotclick-cart', JSON.stringify({ state: { items: [item], cartUpdatedAt: Date.now() }, version: 0 }))
  })
}

/** Elementos fuera de la pantalla y textos recortados sin puntos suspensivos (fuera de carriles con scroll). */
function problemasDeAncho() {
  const ancho = document.documentElement.clientWidth
  const describir = (e: Element) => `${e.tagName.toLowerCase()} "${(e.textContent ?? '').trim().slice(0, 30)}"`
  const recorta = (e: Element) => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o !== 'visible') return o === 'auto' || o === 'scroll' ? 'scroll' : p
    }
    return null
  }
  const conTexto = (e: Element) => Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 2)
  const recorteDeDiseno = (e: Element) => {
    const cs = getComputedStyle(e)
    return cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' || e.closest('[class*="line-clamp"], [class*="truncate"], .sr-only') !== null
  }
  const problemas: string[] = []
  for (const e of Array.from(document.body.querySelectorAll('*'))) {
    const caja = e.getBoundingClientRect()
    if (caja.width <= 1 || caja.height <= 1 || e.closest('svg') || getComputedStyle(e).visibility === 'hidden') continue
    const contenedor = recorta(e)
    if (contenedor === null && (caja.right > ancho + 1 || caja.left < -1)) problemas.push(`fuera: ${describir(e)}`)
    if (contenedor instanceof Element && conTexto(e) && !recorteDeDiseno(e)) {
      const borde = contenedor.getBoundingClientRect()
      if (caja.right > borde.right + 1 || caja.left < borde.left - 1) problemas.push(`recortado: ${describir(e)}`)
    }
  }
  return problemas
}

for (const ancho of ANCHOS) {
  test.describe(`P15 barrido responsive ${ancho}px`, () => {
    test.beforeEach(async ({ page }) => {
      await simularApi(page)
      await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    })

    for (const ruta of RUTAS) {
      test(`${ruta} sin desborde ni recortes`, async ({ page }) => {
        const errores: string[] = []
        page.on('pageerror', (e) => errores.push(e.message))
        await page.goto(ruta)
        await expect(page.locator('#root')).not.toBeEmpty()
        await page.waitForLoadState('networkidle')
        await sinDesborde(page)
        expect(await page.evaluate(problemasDeAncho)).toEqual([])
        expect(errores).toEqual([])
      })
    }

    test('el registro usa el mismo tama\u00f1o en todos sus campos', async ({ page }) => {
      await page.goto('/registro')
      await expect(page.locator('input[type="password"]')).toBeVisible()
      const tamanos = await tamanosDeCampos(page, 'input[type="text"], input[type="email"], input[type="tel"], input[type="password"]')
      expect(tamanos.length).toBeGreaterThan(4)
      expect(new Set(tamanos)).toEqual(new Set([ancho === 390 ? '16px' : '14px']))
    })
  })
}
