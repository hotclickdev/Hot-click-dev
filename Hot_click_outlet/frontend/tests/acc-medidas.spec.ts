import { test, type Locator, type Page } from '@playwright/test'
import { mockApisAcc, sembrarSesion } from './helpers/accFixtures'

/**
 * Compara posiciones y tamaños reales (x, y, ancho, alto) con los del frame de Figma. Solo corre con ACC_MEDIDAS=1:
 * imprime una tabla; no es una prueba funcional. Las medidas de Figma son relativas a la esquina del frame.
 */
test.skip(!process.env.ACC_MEDIDAS, 'Solo mide con ACC_MEDIDAS=1')
test.use(process.env.CI ? {} : { channel: 'chrome' })

type Esperado = [string, Locator, [number, number, number, number]]

async function caja(l: Locator): Promise<number[] | null> {
  const b = await l.first().boundingBox().catch(() => null)
  return b ? [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 2) / 2) : null
}

async function comparar(titulo: string, filas: Esperado[], tolerancia = 1.5) {
  const salida: string[] = [`== ${titulo}`]
  for (const [nombre, loc, esp] of filas) {
    const real = await caja(loc)
    const ok = real && real.every((v, i) => Math.abs(v - esp[i]) <= tolerancia)
    salida.push(`${ok ? 'OK  ' : 'DIFF'} ${nombre.padEnd(34)} figma=[${esp.join(', ')}] app=${real ? `[${real.join(', ')}]` : 'no existe'}`)
  }
  console.log(salida.join('\n'))
}

async function preparar(page: Page, ruta: string, ancho: number, alto: number) {
  await sembrarSesion(page, { favoritos: true })
  await mockApisAcc(page)
  await page.setViewportSize({ width: ancho, height: alto })
  await page.goto(ruta, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
}

test('Mi cuenta móvil 28:1196', async ({ page }) => {
  await preparar(page, '/perfil', 390, 844)
  await comparar('Mi cuenta · móvil 28:1196', [
    ['avatar MS', page.getByText('MS', { exact: true }).first(), [16, 20, 48, 48]],
    ['Hola, María', page.getByRole('heading', { level: 1 }), [76, 23.5, 116, 25]],
    ['pedido activo', page.locator('a[href^="/mis-pedidos?pedido"]').first(), [16, 82, 358, 103]],
    ['acceso Pedidos', page.locator('a[href="/mis-pedidos"]').first(), [16, 221, 174, 94]],
    ['acceso Solicitudes', page.locator('main a[href="/servicios?vista=solicitudes"]').first(), [200, 221, 174, 94]],
    ['acceso Favoritos', page.locator('main a[href="/wishlist"]').first(), [16, 325, 174, 94]],
    ['acceso Opiniones', page.locator('a[href="/perfil?vista=opiniones"]').first(), [200, 325, 174, 94]],
    ['Datos y seguridad', page.locator('a[href="/perfil?vista=seguridad"]').first(), [16, 429, 358, 61]],
    ['Actividad reciente (título)', page.getByRole('heading', { name: 'Actividad reciente' }), [16, 520, 164, 21]],
    ['feed', page.locator('section ul').last(), [16, 551, 358, 184]],
  ])
})

test('Mi cuenta escritorio 30:1479', async ({ page }) => {
  await preparar(page, '/perfil', 1440, 900)
  await comparar('Mi cuenta · desktop 30:1479 (y relativo al contenido bajo el header)', [
    ['menú lateral', page.getByRole('navigation', { name: 'Mi cuenta' }), [120, 0, 260, 278]],
    ['Hola, María', page.getByRole('heading', { level: 1 }), [420, 0, 130, 36]],
    ['pedido activo', page.locator('div.rounded-\\[14px\\].bg-hc-blue-50').first(), [420, 0, 900, 126]],
    ['acceso Pedidos', page.locator('a[href="/mis-pedidos"]').nth(1), [420, 0, 212, 91]],
    ['feed', page.locator('section ul').last(), [420, 0, 900, 105]],
  ], 400)
})

test('Mis opiniones 30:1327', async ({ page }) => {
  await preparar(page, '/perfil?vista=opiniones', 390, 844)
  await comparar('Mis opiniones · móvil 30:1327', [
    ['Pendientes de opinar', page.getByRole('heading', { name: 'Pendientes de opinar' }), [16, 66, 156, 20]],
    ['tarjeta pendiente 1', page.locator('article').nth(0), [16, 98, 358, 261]],
    ['tarjeta pendiente 2', page.locator('article').nth(1), [16, 371, 358, 74]],
    ['Publicadas', page.getByRole('heading', { name: 'Publicadas' }), [16, 473, 92, 20]],
    ['tarjeta publicada', page.locator('article').nth(2), [16, 505, 358, 148]],
  ], 8)
})

test('Datos y seguridad 30:1400', async ({ page }) => {
  await preparar(page, '/perfil?vista=seguridad', 390, 844)
  await comparar('Datos y seguridad · móvil 30:1400', [
    ['DATOS PERSONALES', page.getByText('Datos personales', { exact: true }), [16, 66, 130, 13]],
    ['tarjeta datos', page.locator('div.rounded-\\[14px\\]').nth(0), [16, 94, 358, 170]],
    ['SEGURIDAD', page.getByText('Seguridad', { exact: true }).first(), [16, 444, 70, 13]],
    ['tarjeta seguridad', page.locator('div.rounded-\\[14px\\]').nth(1), [16, 471, 358, 117]],
    ['Cerrar sesión', page.getByRole('button', { name: 'Cerrar sesión' }), [16, 604, 130, 32]],
  ], 8)
})

test('Mis pedidos 28:1310', async ({ page }) => {
  await preparar(page, '/mis-pedidos', 390, 844)
  const tarjetas = page.locator('article')
  await comparar('Mis pedidos · móvil 28:1310', [
    ['filtro Todos', page.getByRole('tab', { name: 'Todos' }), [16, 65, 67, 34]],
    ['tarjeta #1042', tarjetas.nth(0), [16, 114, 358, 148]],
    ['tarjeta #1038', tarjetas.nth(1), [16, 274, 358, 148]],
    ['tarjeta #1021', tarjetas.nth(2), [16, 434, 358, 148]],
    ['Ver detalle (1ª)', page.getByRole('link', { name: /Ver el detalle/ }).first(), [261, 236, 83, 15]],
  ], 2)
})

test('Detalle de pedido 29:1434', async ({ page }) => {
  await preparar(page, '/mis-pedidos?pedido=ORD-10482', 390, 1230)
  const paquetes = page.locator('article')
  await comparar('Detalle de pedido · móvil 29:1434', [
    ['resumen del pedido', page.locator('section').first(), [16, 65, 358, 190]],
    ['paquete 1 de 3', paquetes.nth(0), [16, 267, 358, 335]],
    ['paquete 2 de 3', paquetes.nth(1), [16, 614, 358, 261]],
    ['paquete 3 de 3', paquetes.nth(2), [16, 887, 358, 279]],
    ['acciones paquete 1', paquetes.nth(0).getByRole('link', { name: 'WhatsApp' }), [31, 552, 104, 35]],
    ['nota final', page.getByText('Garantía y opinión se habilitan'), [16, 1178, 358, 32]],
  ], 2)
})

test('Mis solicitudes 29:1535', async ({ page }) => {
  await preparar(page, '/servicios?vista=solicitudes', 390, 844)
  const tarjetas = page.locator('a[href*="solicitud="]')
  await comparar('Mis solicitudes · móvil 29:1535', [
    ['pestañas', page.getByRole('tablist'), [0, 51, 390, 42]],
    ['nueva búsqueda', page.getByRole('link', { name: /¿Buscás algo que no está\?/ }), [16, 107, 358, 70]],
    ['solicitud cotizada', tarjetas.nth(0), [16, 189, 358, 102]],
    ['solicitud en búsqueda', tarjetas.nth(1), [16, 303, 358, 102]],
    ['solicitud cerrada', tarjetas.nth(2), [16, 417, 358, 102]],
  ], 6)
})

test('Verificación en dos pasos 44:1660', async ({ page }) => {
  await sembrarCookiesMedidas(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.getByRole('button', { name: /App autenticadora/ }).click()
  await page.getByText('Confirmá que sos vos').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await comparar('Verificación · móvil 44:1660', [
    ['círculo del escudo', page.locator('form span').first(), [20, 79, 56, 56]],
    ['casillas del código', page.getByRole('group'), [20, 257, 350, 56]],
    ['botón Verificar', page.getByRole('button', { name: 'Verificar', exact: true }), [20, 331, 350, 46]],
    ['¿No tenés la app a mano?', page.getByText('¿No tenés la app a mano?').locator('..'), [20, 395, 350, 127]],
  ], 6)
})

async function sembrarCookiesMedidas(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('hc-return-banner-dismissed', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  })
  await mockApisAcc(page)
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { requires2fa: true, tempToken: 'tmp', methods: ['TOTP', 'EMAIL_OTP'] } }) }))
}
