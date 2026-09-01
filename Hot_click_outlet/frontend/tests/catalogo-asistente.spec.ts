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
  test('el FAB no usa el carácter de estrella', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    const fab = page.getByRole('button', { name: 'Abrir asistente IA' })
    await expect(fab).toBeVisible()
    await expect(fab.getByText('¿DUDAS?')).toBeVisible()
    await expect(fab.getByText('✦')).toHaveCount(0)

    await fab.click()
    const panel = page.locator('.hc-ai-panel')
    await expect(panel.getByText('Asistente HotClick')).toBeVisible()
    await expect(page.getByText('✦')).toHaveCount(0)
    await expect(page.getByText('🛍️')).toHaveCount(0)
    await expect(page.getByText('🎉')).toHaveCount(0)
  })

  test('con teclado simulado el header y el input quedan visibles', async ({ page }) => {
    const tecladoHeight = 480
    const tecladoOffset = 120
    await mockApis(page)
    await mockTecladoMovil(page, tecladoHeight, tecladoOffset)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Abrir asistente IA' }).click()
    const panel = page.locator('.hc-ai-panel')
    await expect(panel.getByText('Asistente HotClick')).toBeVisible()
    await expect(panel.getByPlaceholder('¿Qué más necesitás?')).toBeVisible()

    const box = await panel.evaluate((el) => {
      const s = getComputedStyle(el)
      return { top: s.top, height: s.height }
    })
    expect(box.top).toBe(`${tecladoOffset}px`)
    expect(box.height).toBe(`${tecladoHeight}px`)

    const bodyOverflow = await page.evaluate(() => document.body.style.overflow)
    expect(bodyOverflow).toBe('hidden')
  })
})
