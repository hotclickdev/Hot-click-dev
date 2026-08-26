import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

test.use(process.env.CI ? {} : { channel: 'chrome' })

function jwtSinFirmar(claims) {
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64')
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

async function mockCaja(page) {
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
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  }, AUTH)
  return cobros
}

async function abrirCajaConMouse(page) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('PEDIDO', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Accesorios' }).click()
  await page.getByRole('button', { name: /Mouse/ }).click()
  await expect(page.getByRole('button', { name: /COBRAR/ })).toBeEnabled()
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
    await expect(page.getByText('¿Cómo paga el cliente?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar cobro' })).toBeVisible()
    expect(cobros.venta).toBe(0)
    expect(cobros.qr).toBe(0)
  })

  test('en móvil F2 vuelve al buscador', async ({ page }) => {
    await mockCaja(page)
    await page.setViewportSize({ width: 375, height: 700 })
    await page.goto('/admin/pos', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'Carrito' })).toBeVisible()
    await page.getByRole('button', { name: 'Carrito' }).click()
    await expect(page.getByText('Buscá un producto y tocalo para agregarlo')).toBeVisible()

    await page.keyboard.press('F2')
    await expect(page.locator('[data-pos-search]')).toBeVisible()
    await expect(page.locator('[data-pos-search]')).toBeFocused()
  })
})

test('F8 del POS no dispara crearVenta ni QR', () => {
  const raiz = dirname(fileURLToPath(import.meta.url))
  const atajos = readFileSync(join(raiz, '../src/pages/admin/pos/usePosAtajos.js'), 'utf8')
  const steps = readFileSync(join(raiz, '../src/pages/admin/pos/AdminPOSSteps.jsx'), 'utf8')
  expect(atajos).toContain('onCobrar()')
  expect(atajos).not.toContain('crearVenta')
  expect(atajos).not.toContain('crearQrSesion')
  expect(atajos).not.toContain('handleConfirmarPago')
  expect(steps).toContain("onCobrar={() => pos.setStep('cobro')}")
  expect(steps).toContain('onConfirmar={pos.handleConfirmarPago}')
})
