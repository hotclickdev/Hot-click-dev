import { test, expect, type Page } from '@playwright/test'
import { mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * ACC: Mi cuenta, opiniones, datos y seguridad, pedidos (lista y detalle), favoritos, solicitudes, login y
 * verificación en dos pasos. La API es simulada con los datos de Figma (`tests/helpers/accFixtures.ts`).
 */

const MOVIL = { width: 390, height: 844 }
const ESCRITORIO = { width: 1440, height: 900 }

async function ir(page: Page, ruta: string, tam = MOVIL) {
  await page.setViewportSize(tam)
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
}

test.describe('Mi cuenta', () => {
  test.beforeEach(async ({ page }) => {
    await sembrarSesion(page, { favoritos: true })
    await mockApisAcc(page)
  })

  test('móvil: saludo, pedido en curso y accesos con sus conteos', async ({ page }) => {
    await ir(page, '/perfil')
    await expect(page.getByRole('heading', { level: 1, name: 'Hola, María' })).toBeVisible()
    await expect(page.getByText('maria.rojas@correo.com')).toBeVisible()
    await expect(page.getByText('Pedido ORD-10482 · en camino')).toBeVisible()
    await expect(page.getByText('3 pedidos')).toBeVisible()
    await expect(page.getByText('1 cotizada')).toBeVisible()
    await expect(page.getByText('4 guardados')).toBeVisible()
    await expect(page.getByText('2 pendientes')).toBeVisible()
    await expect(page.getByText('Verificación en dos pasos activada')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible()
  })

  test('el acceso a Opiniones abre la subpantalla y la flecha vuelve al resumen', async ({ page }) => {
    await ir(page, '/perfil')
    await page.getByRole('link', { name: /Opiniones/ }).click()
    await expect(page).toHaveURL(/vista=opiniones/)
    await expect(page.getByRole('heading', { name: 'Pendientes de opinar' })).toBeVisible()
    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Hola, María' })).toBeVisible()
  })

  test('escritorio: menú lateral con Resumen activo y cierre de sesión', async ({ page }) => {
    await ir(page, '/perfil', ESCRITORIO)
    const menu = page.getByRole('navigation', { name: 'Mi cuenta' })
    await expect(menu.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('PEDIDO ACTIVO')).toBeVisible()
    await menu.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hotclick-auth') ?? '{}').state?.token ?? null)).toBeNull()
    await expect(page).toHaveURL(/\/$/)
  })

  test('opiniones: publicar una reseña manda producto, calificación y comentario', async ({ page }) => {
    let cuerpo: Record<string, unknown> | null = null
    await page.route('**/api/testimonios/resena', async (route) => {
      cuerpo = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) })
    })
    await ir(page, '/perfil?vista=opiniones')
    const publicar = page.getByRole('button', { name: 'Publicar' }).first()
    await expect(publicar).toBeDisabled()
    await page.getByRole('radio', { name: '4' }).first().click()
    await page.getByPlaceholder('Contá tu experiencia').fill('Muy buen sérum')
    await expect(publicar).toBeEnabled()
    await publicar.click()
    await expect.poll(() => cuerpo).toMatchObject({ productoId: 501, calificacion: 4, comentario: 'Muy buen sérum' })
  })

  test('opiniones: las publicadas muestran su estado y la revisión de HotClick', async ({ page }) => {
    await ir(page, '/perfil?vista=opiniones')
    await expect(page.getByRole('heading', { name: 'Publicadas' })).toBeVisible()
    await expect(page.getByText('Publicada', { exact: true })).toBeVisible()
    await expect(page.getByText('Revisada por HotClick antes de publicarse')).toBeVisible()
  })

  test('datos y seguridad: muestra los datos, el interruptor de 2 pasos y abre cambiar contraseña', async ({ page }) => {
    await ir(page, '/perfil?vista=seguridad')
    await expect(page.getByText('María Rojas Solano')).toBeVisible()
    await expect(page.getByText('8888-1234')).toBeVisible()
    const dosPasos = page.getByRole('switch', { name: 'Verificación en dos pasos' })
    await expect(dosPasos).toHaveAttribute('aria-checked', 'true')
    // Solo el administrador puede cambiarla (regla previa): para un comprador queda de solo lectura.
    await expect(dosPasos).toBeDisabled()
    await page.getByRole('button', { name: /Cambiar contraseña/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('sin sesión, /perfil lleva al login con retorno', async ({ browser }) => {
    const contexto = await browser.newContext()
    const pagina = await contexto.newPage()
    await sembrarCookies(pagina)
    await pagina.setViewportSize(MOVIL)
    await pagina.goto('/perfil', { waitUntil: 'domcontentloaded' })
    await expect(pagina).toHaveURL(/\/login/)
    await contexto.close()
  })
})

test.describe('Mis pedidos', () => {
  test.beforeEach(async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page)
  })

  test('lista: un pago con 3 paquetes es un solo pedido y los filtros usan su estado', async ({ page }) => {
    await ir(page, '/mis-pedidos')
    await expect(page.getByText('3 paquetes · 1 entregado')).toBeVisible()
    await expect(page.getByText('₡95.900')).toBeVisible()
    await expect(page.getByText('4 productos · 3 tiendas')).toBeVisible()
    await expect(page.getByText('#1038')).toBeVisible()

    await page.getByRole('tab', { name: 'En camino' }).click()
    await expect(page.getByText('ORD-10482').first()).toBeVisible()
    await expect(page.getByText('#1038')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Cancelados' }).click()
    await expect(page.getByText('No tenés pedidos en este estado.')).toBeVisible()
  })

  test('detalle: resumen, paquetes con guía de Correos y acciones según el estado', async ({ page }) => {
    await ir(page, '/mis-pedidos')
    await page.getByRole('link', { name: /Ver el detalle del pedido ORD-10482/ }).click()
    await expect(page).toHaveURL(/pedido=ORD-10482/)
    await expect(page.getByText('24 set. 2026 · pagado con SINPE Móvil')).toBeVisible()
    await expect(page.getByText('Productos (4)')).toBeVisible()
    await expect(page.getByText('Envío · 3 paquetes × ₡4.000')).toBeVisible()
    await expect(page.getByText('Paquete 1 de 3')).toBeVisible()
    await expect(page.getByText('Sale de San José · envío ₡4.000')).toBeVisible()
    await expect(page.getByText('Guía pendiente: Bruma Café está preparando tu paquete.')).toBeVisible()

    const seguir = page.getByRole('link', { name: 'Seguir la guía CR123456789CR' })
    await expect(seguir).toHaveAttribute('href', 'https://correos.go.cr/rastreo/CR123456789CR')
    await expect(seguir).toHaveAttribute('rel', /noopener/)

    // Garantía y opinión solo se habilitan en el paquete entregado (el 3).
    const paquetes = page.locator('article')
    await expect(paquetes).toHaveCount(3)
    await expect(paquetes.nth(0).locator('[aria-disabled="true"]')).toHaveCount(2)
    await expect(paquetes.nth(1).locator('[aria-disabled="true"]')).toHaveCount(2)
    await expect(paquetes.nth(2).locator('[aria-disabled="true"]')).toHaveCount(0)
    await expect(paquetes.nth(2).getByRole('link', { name: 'Garantía' })).toHaveAttribute('href', '/servicios?vista=garantia')
    await expect(paquetes.nth(2).getByRole('link', { name: 'Opinar' })).toHaveAttribute('href', '/perfil?vista=opiniones')
    await expect(paquetes.nth(1).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/50686667888/)
  })

  test('el enlace de rastreo http o con javascript: se reemplaza por el de Correos', async ({ page }) => {
    await mockApisAcc(page, { pedidos: [{ id: 5, numeroPedido: 'ORD-5', estadoPedido: 'ENVIADO', totalPedido: 5000, numeroGuia: 'CR55', urlTracking: 'javascript:alert(1)', items: [], bodega: { provincia: 'Heredia' } }] })
    await ir(page, '/mis-pedidos?pedido=ORD-5')
    await expect(page.getByRole('link', { name: 'Seguir la guía CR55' })).toHaveAttribute('href', 'https://rastreo.correos.go.cr/?codigo=CR55')
  })

  test('sin pedidos: estado vacío con la nota para quien compró sin cuenta', async ({ page }) => {
    await mockApisAcc(page, { pedidos: [] })
    await ir(page, '/mis-pedidos')
    await expect(page.getByRole('heading', { name: 'Todavía no tenés pedidos' })).toBeVisible()
    await expect(page.getByText('¿Compraste sin cuenta?')).toBeVisible()
    await page.getByRole('button', { name: 'Empezar a comprar' }).click()
    await expect(page).toHaveURL(/\/productos/)
  })
})

test.describe('Favoritos', () => {
  test('con productos: tarjetas de catálogo y contador; quitar uno baja la cuenta', async ({ page }) => {
    await sembrarSesion(page, { favoritos: true })
    await mockApisAcc(page)
    await ir(page, '/wishlist')
    await expect(page.getByText('4 guardados').first()).toBeVisible()
    await expect(page.getByText('Bruma Café')).toBeVisible()
    await expect(page.getByText('Quedan 5')).toBeVisible()
    await page.getByRole('button', { name: /Quitar .*Sillón de sala verde/i }).click()
    await expect(page.getByText('3 guardados').first()).toBeVisible()
  })

  test('vacío: invita a explorar y sugiere Descubrí', async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page)
    await ir(page, '/wishlist')
    await expect(page.getByRole('heading', { name: 'Guardá lo que te guste' })).toBeVisible()
    await expect(page.getByText(/Probá Descubrí/)).toBeVisible()
    await page.getByRole('button', { name: 'Explorar productos' }).click()
    await expect(page).toHaveURL(/\/productos/)
  })
})

test.describe('Mis solicitudes', () => {
  test.beforeEach(async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page)
  })

  test('lista: estados cotizada, en búsqueda y cerrada, y acceso para una búsqueda nueva', async ({ page }) => {
    await ir(page, '/servicios?vista=solicitudes')
    await expect(page.getByRole('tab', { name: 'Búsquedas' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Cotizada', { exact: true })).toBeVisible()
    await expect(page.getByText('En búsqueda', { exact: true })).toBeVisible()
    await expect(page.getByText('Cerrada', { exact: true })).toBeVisible()
    await expect(page.getByText('Estamos consultando proveedores')).toBeVisible()
    await expect(page.getByRole('link', { name: /¿Buscás algo que no está?/ })).toHaveAttribute('href', '/servicios?vista=busqueda')
  })

  test('detalle: lo que pediste, la respuesta de HotClick y WhatsApp', async ({ page }) => {
    await ir(page, '/servicios?vista=solicitudes')
    await page.getByRole('link', { name: /Lámpara de pie estilo nórdico/ }).click()
    await expect(page).toHaveURL(/solicitud=31/)
    await expect(page.getByText('Tu búsqueda')).toBeVisible()
    await expect(page.getByText('Te la conseguimos')).toBeVisible()
    await expect(page.getByText('Lámpara de pie nórdica, 1,6 m · ₡24.500')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Hacer una pregunta por WhatsApp' })).toHaveAttribute('href', /wa\.me\/50686667888\?text=/)
    await expect(page.getByText('Solicitud recibida')).toBeVisible()
  })

  test('vacío: pedir un producto o solicitar una garantía', async ({ page }) => {
    await mockApisAcc(page, { solicitudes: [] })
    await ir(page, '/servicios?vista=solicitudes')
    await expect(page.getByRole('heading', { name: 'Sin solicitudes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pedir un producto' })).toHaveAttribute('href', '/servicios?vista=busqueda')
    await expect(page.getByRole('link', { name: 'Solicitar una garantía' })).toHaveAttribute('href', '/servicios?vista=garantia')
  })

  test('/servicios sin parámetro sigue mostrando el inicio de Servicios HOT', async ({ page }) => {
    await ir(page, '/servicios')
    await expect(page.getByText('¿En qué te podemos ayudar?')).toBeVisible()
  })
})

test.describe('Login y verificación en dos pasos', () => {
  test.beforeEach(async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
  })

  test('primero el correo; "Continuar" lo valida y recién entonces pide la contraseña', async ({ page }) => {
    await ir(page, '/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Ingresá o creá tu cuenta' })).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toHaveCount(0)
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Escribí un correo válido.')
    await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await expect(page.getByLabel('Contraseña')).toBeFocused()
    await expect(page.getByRole('link', { name: 'Creá una' })).toHaveAttribute('href', '/registro')
    await expect(page.getByRole('link', { name: /Seguí como invitado/ })).toHaveAttribute('href', '/')
  })

  test('la contraseña no se manda hasta el paso 2 y el inicio de sesión usa el mismo servicio', async ({ page }) => {
    let cuerpo: Record<string, unknown> | null = null
    await page.route('**/api/auth/login', async (route) => {
      cuerpo = route.request().postDataJSON()
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Credenciales incorrectas' }) })
    })
    await ir(page, '/login')
    await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    expect(cuerpo).toBeNull()
    await page.getByLabel('Contraseña').fill('secreta123')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect.poll(() => cuerpo).toMatchObject({ correo: 'maria.rojas@correo.com', contrasena: 'secreta123' })
    await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas')
  })

  test('verificación: elegir método, escribir el código de la app y ofrecer correo y recuperación', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { requires2fa: true, tempToken: 'tmp', methods: ['TOTP', 'EMAIL_OTP'] } }) }))
    let verificacion: Record<string, unknown> | null = null
    await page.route('**/api/auth/2fa/verify', async (route) => {
      verificacion = route.request().postDataJSON()
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Código inválido' }) })
    })
    await ir(page, '/login')
    await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByLabel('Contraseña').fill('secreta123')
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await expect(page.getByRole('heading', { name: 'Elegí cómo verificar' })).toBeVisible()
    await page.getByRole('button', { name: /App autenticadora/ }).click()
    await expect(page.getByRole('heading', { name: 'Confirmá que sos vos' })).toBeVisible()
    await expect(page.getByText('m••••s@correo.com · vence en 5 minutos')).toBeVisible()
    await expect(page.getByRole('button', { name: /Usar un código de recuperación/ })).toBeVisible()

    await page.getByLabel('1', { exact: true }).click()
    await page.keyboard.type('123456')
    await page.getByRole('button', { name: 'Verificar', exact: true }).click()
    await expect.poll(() => verificacion).toMatchObject({ tempToken: 'tmp', code: '123456', method: 'TOTP' })
  })

  test('verificación: el código de recuperación reemplaza a las casillas', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { requires2fa: true, tempToken: 'tmp', method: 'TOTP' } }) }))
    await ir(page, '/login')
    await page.getByLabel('Correo electrónico').fill('maria.rojas@correo.com')
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByLabel('Contraseña').fill('secreta123')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('heading', { name: 'Confirmá que sos vos' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Recibir un código por correo/ })).toHaveCount(0)
    await page.getByRole('button', { name: /Usar un código de recuperación/ }).click()
    await expect(page.getByLabel('Código de recuperación')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Usar código de recuperación' })).toBeVisible()
  })
})

test.describe('Recuperar contraseña y seguimiento sin cuenta', () => {
  test('recuperar: el código se escribe aunque se teclee muy rápido', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/auth/forgot-password', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }))
    await ir(page, '/recuperar-contrasena')
    await page.getByLabel('Correo').fill('ana.solis@gmail.com')
    await page.getByRole('button', { name: 'Enviar código' }).click()
    await page.locator('input[inputmode="numeric"]').first().click()
    await page.keyboard.type('123456')
    const casillas = page.locator('input[inputmode="numeric"]')
    await expect(casillas).toHaveCount(6)
    const valores = await casillas.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).join(''))
    expect(valores).toBe('123456')
  })

  test('seguimiento: paquetes con su estado, guía y la invitación a crear cuenta', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/public/pedidos/seguimiento/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      numeroPedido: 'ORD-10482', fechaPedido: '2026-09-26', total: 95900, invitarCrearCuenta: true,
      paquetes: [
        { tienda: 'Casa Luna 506', origen: 'San José', estado: 'ENVIADO', numeroGuia: 'RR123456789CR', courier: 'CORREOS_CR', urlRastreo: 'https://rastreo.correos.go.cr/?codigo=RR123456789CR', productos: [{ nombre: 'Sofá', cantidad: 1 }] },
        { tienda: 'Taller Ceiba', origen: 'Guanacaste', estado: 'ENTREGADO', fechaEntrega: '2026-09-24', productos: [{ nombre: 'Bloques', cantidad: 1 }] },
      ] } }) }))
    await ir(page, `/seguimiento/${'a'.repeat(64)}`)
    await expect(page.getByRole('heading', { name: 'Seguimiento de tu pedido' })).toBeVisible()
    await expect(page.getByText('2 paquetes · 1 entregado')).toBeVisible()
    await expect(page.getByText('Paquete 1 · Casa Luna 506')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear mi cuenta' })).toBeVisible()
  })
})
