import { test, expect, type Locator, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * P19 — accesibilidad en pantallas del comprador, con aserciones manuales (no hay `@axe-core/playwright`
 * en las dependencias): un solo h1, controles con nombre, hojas modales con foco atrapado, Esc y
 * retorno del foco, foco visible con `--hc-focus-ring`, `prefers-reduced-motion` y el aviso de idioma.
 */

const PRODUCTO = { id: 1, nombreProducto: 'Mouse', precioVenta: 5000, stockActual: 4 }
const FOCO_RGB = 'rgb(63, 108, 222)'

async function preparar(page: Page, { carrito = false } = {}) {
  await page.route('**/api/**', async (route) => {
    const data = /\/api\/productos\/1(?:\?|$)/.test(route.request().url()) ? PRODUCTO : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
  await page.addInitScript((conCarrito) => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    if (conCarrito) {
      localStorage.setItem('hotclick-cart', JSON.stringify({
        state: { items: [{ id: 1, nombre: 'Mouse', precio: 6200, cantidad: 1, stock: 4 }], cartUpdatedAt: Date.now() },
        version: 0,
      }))
    }
  }, carrito)
}

/** Controles visibles sin nombre accesible (aria-labelledby, aria-label, label, texto, alt o title). */
function controlesSinNombre(page: Page) {
  return page.evaluate(() => {
    const texto = (el: Element | null) => (el?.textContent ?? '').trim()
    const nombre = (el: HTMLElement) => {
      const ids = el.getAttribute('aria-labelledby')
      if (ids) return ids.split(/\s+/).map((id) => texto(document.getElementById(id))).join(' ').trim()
      const etiqueta = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
      return (el.getAttribute('aria-label') ?? '').trim() || texto(etiqueta) || texto(el.closest('label'))
        || texto(el) || (el.querySelector('img[alt]')?.getAttribute('alt') ?? '').trim() || (el.getAttribute('title') ?? '').trim()
    }
    return Array.from(document.querySelectorAll<HTMLElement>('a[href], button, input:not([type=hidden]), select, textarea, [role=button]'))
      .filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"], [inert]'))
      .filter((el) => !nombre(el))
      .map((el) => el.outerHTML.slice(0, 120))
  })
}

async function focoDentro(dialogo: Locator) {
  return dialogo.evaluate((d) => d.contains(document.activeElement))
}

/** Abre con Enter, recorre con Tab y Mayús+Tab sin salir, cierra con Esc y exige el foco de vuelta en el disparador. */
async function comprobarHoja(page: Page, disparador: Locator, nombre: string) {
  await disparador.focus()
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: nombre })
  await expect(dialogo).toBeVisible()
  await expect(dialogo).toHaveAttribute('aria-modal', 'true')
  await expect.poll(() => focoDentro(dialogo)).toBe(true)
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press('Tab')
    expect(await focoDentro(dialogo), `Tab ${i + 1} dentro de "${nombre}"`).toBe(true)
  }
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Shift+Tab')
    expect(await focoDentro(dialogo), `Mayús+Tab ${i + 1} dentro de "${nombre}"`).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  await expect(disparador).toBeFocused()
}

const RUTAS_H1 = ['/', '/productos', '/carrito', '/checkout', '/servicios?vista=busqueda', '/servicios?vista=garantia', '/registro', '/ayuda']

for (const [etiqueta, ancho, alto] of [['390', 390, 844], ['1440', 1440, 900]] as const) {
  test.describe(`P19 accesibilidad (${etiqueta})`, () => {
    test.use({ viewport: { width: ancho, height: alto } })

    test('cada pantalla clave tiene un solo h1 y ningún control sin nombre', async ({ page }) => {
      await preparar(page, { carrito: true })
      for (const ruta of RUTAS_H1) {
        await page.goto(ruta, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('main')).toHaveCount(1)
        await expect(page.getByRole('heading', { level: 1 }), `${ruta}: un h1`).toHaveCount(1)
        await expect.poll(() => controlesSinNombre(page), { message: `${ruta}: controles sin nombre` }).toEqual([])
      }
    })

    test('Preferencias de cookies e Idioma y accesibilidad: foco atrapado, Esc y foco de vuelta al pie', async ({ page }) => {
      await preparar(page)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const pie = page.locator('footer')
      await comprobarHoja(page, pie.getByRole('button', { name: 'Preferencias de cookies' }), 'Preferencias de cookies')
      await comprobarHoja(page, pie.getByRole('button', { name: 'Idioma y accesibilidad' }), 'Idioma y accesibilidad')
    })

    test('el foco de teclado se ve: anillo --hc-focus-ring o cambio del contenedor', async ({ page }) => {
      await preparar(page)
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })
      for (let i = 0; i < 10; i += 1) {
        await page.keyboard.press('Tab')
        const foco = await page.evaluate(() => {
          const el = document.activeElement
          if (!(el instanceof HTMLElement) || el === document.body) return { visible: true, anillo: '' }
          const s = getComputedStyle(el)
          if (s.outlineStyle !== 'none') return { visible: true, anillo: s.outlineColor }
          // Campos con `outline-none`: el foco lo marca el contenedor (borde, sombra o fondo).
          const firma = () => {
            const partes: string[] = []
            for (let n: HTMLElement | null = el, k = 0; n && k < 4; n = n.parentElement, k += 1) {
              const c = getComputedStyle(n)
              partes.push([c.outlineStyle, c.boxShadow, c.borderTopColor, c.borderBottomColor, c.backgroundColor].join('/'))
            }
            return partes.join('|')
          }
          const conFoco = firma()
          el.blur()
          const sinFoco = firma()
          el.focus()
          return { visible: conFoco !== sinFoco, anillo: '' }
        })
        expect(foco.visible, `parada ${i + 1}`).toBe(true)
        if (foco.anillo) expect(foco.anillo, `parada ${i + 1}`).toBe(FOCO_RGB)
      }
    })

    test('registro: el teléfono tiene nombre y foco visible, y el título es un solo h1', async ({ page }) => {
      await preparar(page)
      await page.goto('/registro', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1, name: /Crear cuenta\s+en HotClick/ })).toHaveCount(1)
      const telefono = page.getByRole('textbox', { name: 'Teléfono' })
      // Tab marca la navegación por teclado; con ratón el campo se ve como en el diseño.
      await page.keyboard.press('Tab')
      await telefono.focus()
      await expect(telefono).toHaveCSS('outline-style', 'solid')
      await expect(telefono).toHaveCSS('outline-color', FOCO_RGB)
      await telefono.click()
      await expect(telefono).toHaveCSS('outline-style', 'none')
    })

    test('prefers-reduced-motion corta transiciones y animaciones CSS', async ({ page }) => {
      await preparar(page)
      const duraciones = () => page.evaluate(() => {
        const prueba = document.createElement('div')
        prueba.style.transition = 'opacity 300ms'
        prueba.style.animation = 'pagefade 400ms infinite'
        document.body.append(prueba)
        const s = getComputedStyle(prueba)
        const valores = [Number.parseFloat(s.transitionDuration), Number.parseFloat(s.animationDuration), s.animationIterationCount]
        prueba.remove()
        return valores
      })
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      expect(await duraciones()).toEqual([0.3, 0.4, 'infinite'])
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const [transicion, animacion, vueltas] = await duraciones()
      expect(transicion).toBeLessThan(0.001)
      expect(animacion).toBeLessThan(0.001)
      expect(vueltas).toBe('1')
    })
  })
}

test.describe('P19 accesibilidad (390, hojas del comprador)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('búsqueda: foco atrapado, Esc y foco de vuelta al buscador del header', async ({ page }) => {
    await preparar(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await comprobarHoja(page, page.getByRole('button', { name: 'Buscá o describí lo que necesitás' }), 'Buscar en HotClick')
  })

  test('ficha: "Agregado a tu pedido" atrapa el foco y lo devuelve a Agregar', async ({ page }) => {
    await preparar(page)
    await page.goto('/productos/1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1, name: 'Mouse' })).toBeVisible()
    await comprobarHoja(page, page.getByRole('button', { name: /^Agregar/ }).last(), 'Agregado a tu pedido')
  })

  test('el cambio de idioma se anuncia solo cuando ocurre, no al cargar', async ({ page }) => {
    await preparar(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const aviso = page.getByRole('status').filter({ hasText: /Idioma cambiado|Language changed/ })
    await page.waitForTimeout(500)
    await expect(aviso).toHaveCount(0)
    await page.locator('footer').getByRole('button', { name: 'Idioma y accesibilidad' }).click()
    await page.getByRole('radio', { name: 'Español' }).press('ArrowRight')
    await expect(page.getByRole('status').filter({ hasText: 'Language changed to English' })).toHaveCount(1)
  })
})
