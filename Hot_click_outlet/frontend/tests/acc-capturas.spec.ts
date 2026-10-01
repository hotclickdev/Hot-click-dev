import { test, type Page } from '@playwright/test'
import { mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

/**
 * Capturas de las pantallas ACC para compararlas contra Figma. Solo corre con ACC_SHOTS=<carpeta>;
 * sin esa variable se omite (no es una prueba funcional).
 */
const SALIDA = process.env.ACC_SHOTS
test.skip(!SALIDA, 'Solo captura cuando ACC_SHOTS apunta a una carpeta')
test.use(process.env.CI ? {} : { channel: 'chrome' })

async function ir(page: Page, ruta: string, nombre: string, ancho = 390, alto = 844) {
  await page.setViewportSize({ width: ancho, height: alto })
  await page.goto(ruta, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true })
}

test('capturas con sesión', async ({ page }) => {
  await sembrarSesion(page, { favoritos: true })
  await mockApisAcc(page)
  await ir(page, '/perfil', 'perfil-movil')
  await ir(page, '/perfil', 'perfil-desktop', 1440, 900)
  await ir(page, '/perfil?vista=opiniones', 'opiniones-movil')
  await ir(page, '/perfil?vista=opiniones', 'opiniones-desktop', 1440, 900)
  await ir(page, '/perfil?vista=seguridad', 'seguridad-movil')
  await ir(page, '/perfil?vista=seguridad', 'seguridad-desktop', 1440, 900)
  await ir(page, '/mis-pedidos', 'pedidos-movil')
  await ir(page, '/mis-pedidos?pedido=ORD-10482', 'pedido-detalle-movil', 390, 1230)
  await ir(page, '/wishlist', 'favoritos-movil')
  await ir(page, '/servicios', 'servicios-movil')
  await ir(page, '/servicios?vista=solicitudes', 'solicitudes-movil')
  await ir(page, '/servicios?vista=solicitudes&solicitud=31', 'solicitud-cotizada-movil')
})

test('capturas de estados vacíos con sesión', async ({ page }) => {
  await sembrarSesion(page)
  await mockApisAcc(page, { pedidos: [], solicitudes: [], paraResenar: [], misTestimonios: [] })
  await ir(page, '/wishlist', 'favoritos-vacio-movil')
  await ir(page, '/mis-pedidos', 'pedidos-vacio-movil')
  await ir(page, '/servicios?vista=solicitudes', 'solicitudes-vacio-movil')
})

test('capturas del flujo de login y verificación', async ({ page }) => {
  await sembrarCookies(page)
  await mockApisAcc(page)
  await page.route('**/api/auth/login', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { requires2fa: true, tempToken: 'tmp', methods: ['TOTP', 'EMAIL_OTP'] } }) }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${SALIDA}/login-correo-movil.png`, fullPage: true })
  await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Contraseña').fill('secreta123')
  await page.screenshot({ path: `${SALIDA}/login-contrasena-movil.png`, fullPage: true })
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.getByText('Elegí cómo verificar').waitFor()
  await page.screenshot({ path: `${SALIDA}/verificacion-elegir-movil.png`, fullPage: true })
  await page.getByRole('button', { name: /App autenticadora/ }).click()
  await page.getByText('Confirmá que sos vos').waitFor()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${SALIDA}/verificacion-app-movil.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: `${SALIDA}/verificacion-app-desktop.png`, fullPage: true })
})

test('capturas de recuperar contraseña y seguimiento', async ({ page }) => {
  await sembrarCookies(page)
  await mockApisAcc(page)
  const token = 'a'.repeat(64)
  await page.route('**/api/public/pedidos/seguimiento/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
    numeroPedido: 'ORD-10482', fechaPedido: '2026-09-26', total: 95900, invitarCrearCuenta: true,
    paquetes: [
      { tienda: 'Casa Luna 506', origen: 'San José', estado: 'ENVIADO', numeroGuia: 'RR123456789CR', courier: 'CORREOS_CR', urlRastreo: 'https://rastreo.correos.go.cr/?codigo=RR123456789CR', productos: [{ nombre: 'Sofá de sala dos plazas', cantidad: 1 }, { nombre: 'Auriculares over-ear', cantidad: 1 }] },
      { tienda: 'Bruma Café', origen: 'Cartago', estado: 'EN_PREPARACION', productos: [{ nombre: 'Sillón de sala verde', cantidad: 1 }] },
      { tienda: 'Taller Ceiba', origen: 'Guanacaste', estado: 'ENTREGADO', numeroGuia: 'RR987654321CR', fechaEntrega: '2026-09-24', productos: [{ nombre: 'Bloques de madera para niños', cantidad: 1 }] },
    ] } }) }))
  await ir(page, `/seguimiento/${token}`, 'seguimiento-movil', 390, 893)
  await page.route('**/api/auth/forgot-password', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }))
  await page.route('**/api/auth/verify-code', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/recuperar-contrasena', { waitUntil: 'networkidle' })
  await page.getByLabel('Correo').fill('ana.solis@gmail.com')
  await page.screenshot({ path: `${SALIDA}/recuperar-1-movil.png`, fullPage: true })
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${SALIDA}/recuperar-2-movil.png`, fullPage: true })
  await page.locator('input[inputmode="numeric"]').first().click()
  await page.keyboard.type('123456')
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${SALIDA}/recuperar-3-movil.png`, fullPage: true })
})

test('capturas sin sesión y vacíos', async ({ page }) => {
  await sembrarCookies(page)
  await mockApisAcc(page, { pedidos: [], solicitudes: [] })
  await ir(page, '/login', 'login-movil')
  await ir(page, '/recuperar-contrasena', 'recuperar-movil')
})
