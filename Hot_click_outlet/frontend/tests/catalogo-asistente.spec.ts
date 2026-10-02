import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

/** Simula teclado móvil: viewport visible más chico y desplazado. */
async function mockTecladoMovil(page: Page, height = 480, offsetTop = 120) {
  await page.addInitScript(({ h, top }) => {
    const listeners = new Map<string, Set<() => void>>()
    const vv = {
      width: 390,
      height: h,
      offsetTop: top,
      offsetLeft: 0,
      pageTop: top,
      pageLeft: 0,
      scale: 1,
      addEventListener(type: string, fn: () => void) {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)!.add(fn)
      },
      removeEventListener(type: string, fn: () => void) {
        listeners.get(type)?.delete(fn)
      },
      dispatchEvent() { return true },
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv })
  }, { h: height, top: offsetTop })
}

test.describe('Catálogo — asistente IA', () => {
  test('en móvil el asistente abre como hoja inferior, sin emojis ni estrellas', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos?ai=1', { waitUntil: 'domcontentloaded' })

    const hoja = page.getByRole('dialog', { name: 'Asistente HotClick' })
    await expect(hoja).toBeVisible()
    await expect(hoja.getByText('Solo recomienda productos del catálogo')).toBeVisible()
    await expect(page.getByText('✦')).toHaveCount(0)
    await expect(page.getByText('🛍️')).toHaveCount(0)
    await expect(page.getByText('🎉')).toHaveCount(0)

    // la hoja entra con una animación: se espera a que termine de subir
    await expect.poll(async () => (await hoja.boundingBox())?.y).toBeCloseTo(82, 0)
    const caja = await hoja.boundingBox()
    expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeCloseTo(844, 0)
  })

  test('con teclado simulado la hoja y el campo quedan en el viewport visible', async ({ page }) => {
    const tecladoHeight = 480
    const tecladoOffset = 120
    await mockApis(page)
    await mockTecladoMovil(page, tecladoHeight, tecladoOffset)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos?ai=1', { waitUntil: 'domcontentloaded' })

    const hoja = page.getByRole('dialog', { name: 'Asistente HotClick' })
    await expect(hoja).toBeVisible()
    await expect(hoja.getByPlaceholder('¿Qué estás buscando?')).toBeVisible()

    const box = await hoja.evaluate((el) => {
      const s = getComputedStyle(el)
      return { top: s.top, height: s.height }
    })
    expect(box.top).toBe(`${tecladoOffset + 82}px`)
    expect(box.height).toBe(`${tecladoHeight - 82}px`)
  })
})
