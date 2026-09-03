import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

const AUTH = {
  state: {
    token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR' }),
    refreshToken: null,
    userId: 1,
    userEmail: 'caja@hotclick.test',
    userRole: 'EMPRENDEDOR',
    userName: 'Caja',
    empresaId: 1,
    empresaSlug: 'demo',
    empresaNombre: 'Demo',
    permissions: [],
    roles: ['EMPRENDEDOR'],
  },
  version: 0,
}

const PRODUCTO = {
  id: 1,
  nombreProducto: 'Mouse',
  precioVenta: 5000,
  stockActual: 4,
}

async function mockCaja(page: Page) {
  const cobros = { venta: 0, qr: 0 }
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    if (path.includes('/pos/venta') && method !== 'GET') {
      cobros.venta += 1
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      return
    }
    if (path.includes('/pos/qr') && method !== 'GET') {
      cobros.qr += 1
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      return
    }
    if (path.includes('/pos/caja/activo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, estado: 'ABIERTA' } }),
      })
      return
    }
    if (path.includes('/productos/pos/categoria/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [PRODUCTO] }),
      })
      return
    }
    if (path.includes('/productos/pos/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, nombreCategoria: 'Accesorios' }] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, AUTH)
  return cobros
}

async function abrirCajaConMouse(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Caja (POS)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cerrar turno' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Cuadre' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Accesorios' }).click()
  await page.getByRole('button', { name: /Mouse/ }).click()
  await expect(page.getByRole('button', { name: /Cobrar/i }).first()).toBeEnabled()
}

test.describe('POS — atajos de caja', () => {
  test('F2 busca, F4 va a cantidad y F8 cobra sin confirmar el pago', async ({ page }) => {
    const cobros = await mockCaja(page)
    await abrirCajaConMouse(page)

    await page.keyboard.press('F2')
    await expect(page.locator('[data-pos-search]')).toBeFocused()

    await page.keyboard.press('F4')
    await expect(page.locator('[data-pos-qty]').last()).toBeFocused()

    await page.keyboard.press('F8')
    await expect(page.getByText('Método de pago')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).toBeVisible()
    expect(cobros.venta).toBe(0)
    expect(cobros.qr).toBe(0)
  })

  test('Exacto llena el total y habilita confirmar cobro', async ({ page }) => {
    await mockCaja(page)
    await abrirCajaConMouse(page)
    await page.getByRole('button', { name: /Cobrar/i }).first().click()

    const confirmar = page.getByRole('button', { name: 'Confirmar cobro' })
    await expect(confirmar).toBeDisabled()
    await page.getByRole('button', { name: /Exacto/ }).click()
    await expect(page.getByRole('spinbutton')).toHaveValue('5000')
    await expect(confirmar).toBeEnabled()
  })

  test('en móvil F2 vuelve al buscador', async ({ page }) => {
    await mockCaja(page)
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Caja (POS)' })).toBeVisible()
    await page.getByRole('button', { name: 'Accesorios' }).click()
    await page.getByRole('button', { name: /Mouse/ }).click()
    await page.locator('[data-pos-ticket-open]').click()
    await expect(page.getByRole('dialog', { name: 'Factura' })).toBeVisible()

    await page.keyboard.press('F2')
    await expect(page.locator('[data-pos-search]')).toBeVisible()
    await expect(page.locator('[data-pos-search]')).toBeFocused()
  })
})

async function mockCajaConQr(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    if (path.endsWith('/pos/qr') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'tokentarjetaqr01',
            total: 5000,
            metodoPago: 'TARJETA',
            sinpeNumero: '',
          },
        }),
      })
      return
    }
    if (path.includes('/pos/qr/pago/') && path.endsWith('/estado')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ estado: 'PENDIENTE' }),
      })
      return
    }
    if (path.includes('/pos/venta') && method !== 'GET') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      return
    }
    if (path.includes('/pos/caja/activo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 1, estado: 'ABIERTA' } }),
      })
      return
    }
    if (path.includes('/productos/pos/categoria/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [PRODUCTO] }),
      })
      return
    }
    if (path.includes('/productos/pos/categorias')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, nombreCategoria: 'Accesorios' }] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, AUTH)
}

test.describe('POS — QR de tarjeta', () => {
  test('cobrar con tarjeta muestra el código QR con el enlace de pago', async ({ page }) => {
    await mockCajaConQr(page)
    await abrirCajaConMouse(page)

    await page.getByRole('button', { name: /Cobrar/i }).first().click()
    await expect(page.getByText('Método de pago')).toBeVisible()
    await page.getByRole('button', { name: 'Tarjeta' }).click()
    await page.getByRole('button', { name: 'Generar QR de pago' }).click()

    await expect(page.getByText('Pago con tarjeta')).toBeVisible()
    await expect(page.getByText('/pos/pago/tokentarjetaqr01')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Código QR de pago' })).toBeVisible()
    await expect(page.getByText(/Esperando confirmación del pago del cliente/i)).toBeVisible()
    await expect(page.getByText(/carrito/i)).toHaveCount(0)
  })
})

test('F8 del POS no dispara crearVenta ni QR', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const atajos = readFileSync(join(raiz, '../src/pages/admin/pos/usePosAtajos.ts'), 'utf8')
  const steps = readFileSync(join(raiz, '../src/pages/admin/pos/AdminPOSSteps.tsx'), 'utf8')
  expect(atajos).toContain('onCobrar()')
  expect(atajos).not.toContain('crearVenta')
  expect(atajos).not.toContain('crearQrSesion')
  expect(atajos).not.toContain('handleConfirmarPago')
  expect(steps).toContain("pos.setStep('cobro')")
  expect(steps).toContain('onConfirmar={pos.handleConfirmarPago}')
})

test('StepQR no monta react-qr-code (CJS + React 19 → error #130)', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const stepQr = readFileSync(join(raiz, '../src/pages/admin/pos/StepQR.tsx'), 'utf8')
  const imagen = readFileSync(join(raiz, '../src/pages/admin/pos/PosQrImagen.tsx'), 'utf8')
  expect(stepQr).not.toContain('react-qr-code')
  expect(stepQr).toContain('PosQrImagen')
  expect(imagen).toContain("from 'qrcode'")
  expect(imagen).toContain('toDataURL')
})
