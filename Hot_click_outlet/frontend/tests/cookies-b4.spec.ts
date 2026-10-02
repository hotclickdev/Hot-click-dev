import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * B4: el aviso `45:1946` pasa a PASS móvil si la tarjeta coincide a 390×844.
 * No hay frame desktop: 1440 solo comprueba que no desborda.
 */

const TARJETA = { x: 12, y: 560, w: 366, h: 205 }

async function apiVacia(page: Page) {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
  )
}

async function sinConsentimiento(page: Page, conCupon: boolean) {
  await page.addInitScript((mostrarCupon) => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    if (mostrarCupon) sessionStorage.setItem('hc-paginas-sesion', '2')
    else localStorage.setItem('hc-promo-seen', String(Date.now()))
  }, conCupon)
}

async function abrirHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.fonts.ready)
  const aviso = page.getByRole('region', { name: 'Usamos cookies para mejorar tu experiencia' })
  await expect(aviso).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1000)
  return aviso
}

async function caja(page: Page) {
  return page.getByRole('region', { name: 'Usamos cookies para mejorar tu experiencia' }).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

function dentroDeUnPx(actual: number, esperado: number) {
  expect(Math.abs(actual - esperado), `${actual} vs ${esperado}`).toBeLessThanOrEqual(1)
}

test.describe('Aviso de cookies — móvil 390', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la tarjeta coincide con 45:2152 y no desborda', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, false)
    await abrirHome(page)
    const medida = await caja(page)
    dentroDeUnPx(medida.x, TARJETA.x)
    dentroDeUnPx(medida.y, TARJETA.y)
    dentroDeUnPx(medida.w, TARJETA.w)
    dentroDeUnPx(medida.h, TARJETA.h)
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)
  })

  test('Solo esenciales guarda y oculta el aviso', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, false)
    const aviso = await abrirHome(page)
    await page.getByRole('button', { name: 'Solo esenciales' }).click()
    await expect(aviso).toHaveCount(0)
    const guardado = await page.evaluate(() => localStorage.getItem('hotclick-cookie-consent') ?? '')
    expect(JSON.parse(guardado).analytics).toBe(false)
  })

  test('Aceptar todo guarda y oculta el aviso', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, false)
    const aviso = await abrirHome(page)
    await page.getByRole('button', { name: 'Aceptar todo' }).click()
    await expect(aviso).toHaveCount(0)
    const guardado = await page.evaluate(() => localStorage.getItem('hotclick-cookie-consent') ?? '')
    expect(JSON.parse(guardado).analytics).toBe(true)
  })

  test('Configurar abre la hoja y Guardar preferencias persiste', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, false)
    await abrirHome(page)
    await page.getByRole('button', { name: 'Configurar' }).click()
    const hoja = page.getByRole('dialog', { name: 'Preferencias de cookies' })
    await expect(hoja).toBeVisible()
    await hoja.getByRole('button', { name: 'Guardar preferencias' }).click()
    await expect(hoja).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Usamos cookies para mejorar tu experiencia' })).toHaveCount(0)
    const guardado = await page.evaluate(() => localStorage.getItem('hotclick-cookie-consent') ?? '')
    expect(JSON.parse(guardado).analytics).toBe(true)
  })

  test('el aviso no tapa el cupón', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, true)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const campo = page.getByPlaceholder('tu@correo.com')
    await expect(campo).toBeVisible({ timeout: 15_000 })
    const aviso = page.getByRole('region', { name: 'Usamos cookies para mejorar tu experiencia' })
    await expect(aviso).toBeVisible({ timeout: 20_000 })
    const recibe = await campo.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const encima = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return encima === el || el.contains(encima)
    })
    expect(recibe).toBe(true)
  })
})

test.describe('Aviso de cookies — 1440 sin frame', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('el aviso no desborda y no se afirma una coordenada', async ({ page }) => {
    test.setTimeout(60_000)
    await apiVacia(page)
    await sinConsentimiento(page, false)
    await abrirHome(page)
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde).toBeLessThanOrEqual(0)
  })
})
