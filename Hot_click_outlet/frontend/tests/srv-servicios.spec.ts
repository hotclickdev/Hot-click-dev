import { test, expect, type Page, type Route } from '@playwright/test'
import { FOTOS, SOLICITUDES, mockApisAcc, sembrarCookies, sembrarSesion } from './helpers/accFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * SRV: Servicios HOT, encargo, cotización pública, páginas informativas (Envíos) y blog.
 * La API es simulada; las medidas y los textos salen de Figma (`28:1429`, `28:1486`, `28:1531`, `28:1594`,
 * `28:1660`, `55:2332`, `54:2126`, `54:2219`).
 */

const MOVIL = { width: 390, height: 844 }

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

async function ir(page: Page, ruta: string, tam = MOVIL) {
  await page.setViewportSize(tam)
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
}

const GARANTIAS = [
  { productoId: 1, pedidoId: 1048, numeroPedido: 1048, activa: true, diasRestantes: 28, garantiaDias: 40, fechaVencimiento: '2026-10-22', fechaEntrega: '2026-09-12', imagenUrl: FOTOS.auriculares, nombre: 'Auriculares over-ear' },
  { productoId: 2, pedidoId: 1031, numeroPedido: 1031, activa: true, diasRestantes: 12, garantiaDias: 40, fechaVencimiento: '2026-10-09', fechaEntrega: '2026-08-30', imagenUrl: FOTOS.zapatos, nombre: 'Zapatos running rojo' },
  { productoId: 3, pedidoId: 1001, numeroPedido: 1001, activa: false, diasRestantes: 0, garantiaDias: 40, fechaVencimiento: '2026-07-01', fechaEntrega: '2026-05-20', imagenUrl: FOTOS.bloques, nombre: 'Bloques de madera' },
]

test.describe('Servicios HOT', () => {
  test('inicio: cuatro opciones y aviso de solicitudes en curso', async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page)
    await ir(page, '/servicios')
    await expect(page.getByRole('heading', { level: 1, name: '¿En qué te ayudamos?' })).toBeVisible()
    for (const titulo of ['Te lo conseguimos', 'Garantía de un producto', 'Digitalizá tu inventario', 'Contanos tu experiencia']) {
      await expect(page.getByRole('button', { name: new RegExp(titulo) })).toBeVisible()
    }
    // Las fixtures traen dos solicitudes abiertas (cotizada y en búsqueda) y una cerrada.
    const aviso = page.getByRole('link', { name: 'Tenés 2 solicitudes en curso' })
    await expect(aviso).toHaveAttribute('href', '/servicios?vista=solicitudes')
  })

  test('inicio sin sesión no muestra el aviso de solicitudes', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/servicios')
    await expect(page.getByText(/solicitudes? en curso/)).toHaveCount(0)
  })

  test('te lo conseguimos: envía la solicitud con el teléfono con prefijo y deja ver su estado', async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page, { solicitudes: SOLICITUDES })
    let cuerpo: Record<string, unknown> | null = null
    await page.route('**/api/servicios', async (route) => {
      if (route.request().method() === 'POST') {
        cuerpo = route.request().postDataJSON() as Record<string, unknown>
        return json(route, { success: true, data: { id: 99 } })
      }
      return route.fallback()
    })
    await ir(page, '/servicios')
    await page.getByRole('button', { name: /Te lo conseguimos/ }).click()
    await expect(page.getByText('1 · Foto')).toBeVisible()

    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(page.getByRole('alert')).toHaveText('Contanos qué producto estás buscando.')

    await page.getByLabel('¿Qué estás buscando?').fill('Una lámpara de pie de madera')
    await page.getByLabel('Presupuesto aproximado').fill('₡25.000 – ₡40.000')
    await page.getByLabel('Tu WhatsApp').fill('8888 8888')
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()

    await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible()
    expect(cuerpo).toMatchObject({ descripcion: 'Una lámpara de pie de madera', presupuesto: '₡25.000 – ₡40.000', telefonoContacto: '+50688888888' })
    await expect(page.getByRole('link', { name: 'Ver mis solicitudes' })).toHaveAttribute('href', '/servicios?vista=solicitudes')
  })

  test('te lo conseguimos: el invitado puede dejar su nombre y no ve el seguimiento de Mi cuenta', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/servicios?vista=busqueda')
    await expect(page.getByLabel('Tu nombre (opcional)')).toBeVisible()
    await expect(page.getByText(/Mi cuenta › Solicitudes/)).toHaveCount(0)
  })

  test('garantía: elige el producto y el motivo, y envía a la tienda', async ({ page }) => {
    await sembrarSesion(page)
    await mockApisAcc(page)
    await page.route('**/api/garantias/mis-garantias', (route) => json(route, { success: true, data: GARANTIAS }))
    let cuerpo: Record<string, unknown> | null = null
    await page.route('**/api/garantias/solicitudes', async (route) => {
      if (route.request().method() === 'POST') {
        cuerpo = route.request().postDataJSON() as Record<string, unknown>
        return json(route, { success: true, data: {} })
      }
      return route.fallback()
    })
    await ir(page, '/servicios?vista=garantia')

    await expect(page.getByRole('radio', { name: /Auriculares over-ear/ })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: /Bloques de madera/ })).toBeDisabled()
    await page.getByRole('radio', { name: /Zapatos running rojo/ }).click()
    await page.getByRole('radio', { name: 'Se dañó' }).click()

    await page.getByRole('button', { name: 'Enviar a la tienda' }).click()
    await expect(page.getByRole('alert')).toHaveText('Describí el problema antes de enviar.')

    await page.getByLabel('Contanos qué pasó').fill('La suela se despegó')
    await page.getByRole('button', { name: 'Enviar a la tienda' }).click()
    await expect(page.getByRole('heading', { name: 'Solicitud enviada' })).toBeVisible()
    expect(cuerpo).toMatchObject({ productoId: 2, pedidoId: 1031, descripcion: '[Motivo: Se dañó] La suela se despegó' })
  })

  test('garantía sin sesión pide iniciar sesión y vuelve a la garantía', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/servicios?vista=garantia')
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', /\/login\?redirect=.*garantia/)
  })

  test('la flecha de la barra vuelve al inicio de Servicios HOT', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/servicios')
    await page.getByRole('button', { name: /Digitalizá tu inventario/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Digitalizá tu inventario' })).toBeVisible()
    await page.getByRole('button', { name: /atrás|volver/i }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: '¿En qué te ayudamos?' })).toBeVisible()
  })
})

test.describe('Encargo y cotización públicos', () => {
  const ENCARGO = { id: 214, productoNombre: 'Taza personalizada “Mamá”', nombreCliente: 'María', email: 'm@x.cr', modoPrecio: 'FIJO', estado: 'APROBADO', precioCotizado: 11000, tokenPublico: 'tok', fechaCreacion: '2026-09-22T10:14:00' }

  test('encargo aprobado: línea de tiempo, total y botón de pago', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/public/encargos/tok', (route) => json(route, { success: true, data: ENCARGO }))
    await ir(page, '/encargo/tok')
    await expect(page.getByRole('heading', { level: 1, name: /Taza personalizada/ })).toBeVisible()
    await expect(page.getByText('Hecho a pedido')).toBeVisible()
    await expect(page.getByText('22 sep · 10:14')).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Esperando tu pago' })).toHaveAttribute('aria-current', 'step')
    await expect(page.getByRole('button', { name: 'Pagar ₡11.000' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Escribirle a la tienda' })).toHaveAttribute('href', /wa\.me\/50686667888/)
  })

  test('encargo rechazado muestra el motivo y no ofrece pagar', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/public/encargos/tok', (route) => json(route, { success: true, data: { ...ENCARGO, estado: 'RECHAZADO', precioCotizado: null, motivoRechazo: 'No hacemos ese diseño' } }))
    await ir(page, '/encargo/tok')
    await expect(page.getByText('No hacemos ese diseño')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pagar/ })).toHaveCount(0)
  })

  test('encargo inexistente ofrece volver al catálogo', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/public/encargos/xxx', (route) => json(route, { success: false }, 404))
    await ir(page, '/encargo/xxx')
    await expect(page.getByRole('heading', { name: 'No encontramos este encargo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute('href', '/productos')
  })

  test('cotización pública: totales con punto de miles y consulta por WhatsApp', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/cotizaciones/publica/tok', (route) => json(route, {
      success: true,
      data: {
        empresa: { nombreEmpresa: 'Casa Luna 506' },
        cliente: { razonSocial: 'Café Aroma S.A.', cedulaJuridica: '3-101-000000', correo: 'compras@cafearoma.cr' },
        items: [{ nombre: 'Taza personalizada', cantidad: 20, unidadMedida: 'unidades', precioUnitario: 11000, descuentoPorcentaje: 10 }],
        numeroCotizacion: 'COT-2026-0142', fechaEmision: '2026-09-25', fechaVencimiento: '2026-10-10', estadoCotizacion: 'ENVIADA',
        subtotal: 198000, aplicaIva: true, porcentajeIva: 13, montoIva: 25740, total: 223740, moneda: 'CRC',
      },
    }))
    await ir(page, '/cotizacion/tok')
    await expect(page.getByRole('heading', { level: 1, name: 'COT-2026-0142' })).toBeVisible()
    await expect(page.getByText('Cotización de Casa Luna 506')).toBeVisible()
    await expect(page.getByText('Emitida 25 sep 2026 · válida hasta 10 oct 2026')).toBeVisible()
    await expect(page.getByText('20 unidades × ₡11.000 · 10% desc.')).toBeVisible()
    await expect(page.getByText('₡223.740')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Consultar por WhatsApp' })).toHaveAttribute('href', /wa\.me\/50686667888\?text=/)
    // "Aceptar cotización" es una función por programar: no se dibuja ni se anota en la interfaz.
    await expect(page.getByText('Aceptar cotización')).toHaveCount(0)
    await expect(page.getByText('NUEVO · por programar')).toHaveCount(0)
  })
})

test.describe('Envíos (plantilla informativa)', () => {
  test('intro con índice, tarifas y preguntas que se despliegan', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/envios')
    await expect(page.getByRole('heading', { level: 1, name: 'Así llega tu pedido' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tarifas' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Envío rápido GAM' }).getByText('₡5.000')).toBeVisible()

    const pregunta = page.getByRole('button', { name: '¿Cómo puedo rastrear mi pedido?' })
    await expect(pregunta).toHaveAttribute('aria-expanded', 'false')
    await pregunta.click()
    await expect(pregunta).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('link', { name: 'Mis Pedidos' })).toHaveAttribute('href', '/mis-pedidos')

    await expect(page.getByText('Plantilla reutilizable')).toHaveCount(0)
  })

  test('el índice lleva a las preguntas frecuentes', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await ir(page, '/envios')
    await page.getByRole('navigation', { name: 'Contenido de la página' }).getByRole('button', { name: 'Preguntas' }).click()
    await expect(page.getByRole('heading', { name: 'Preguntas frecuentes' })).toBeInViewport()
  })
})

test.describe('Blog', () => {
  const ENTRADAS = [
    { id: 1, slug: 'sofa', titulo: 'Cómo elegir un sofá para una sala pequeña', resumen: 'Medidas y colores.', imagenUrl: FOTOS.sofa, fechaPublicacion: '2026-09-12', contenido: `<p>${'palabra '.repeat(900)}</p>` },
    { id: 2, slug: 'regalos', titulo: '7 regalos hechos a mano', resumen: 'Tazas y bolsos.', imagenUrl: FOTOS.taza, fechaPublicacion: '2026-09-05', contenido: '<p>Hola</p>' },
  ]

  test('listado: artículo destacado y lista, con el enlace a cada uno', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/blog/publico', (route) => json(route, { success: true, data: ENTRADAS }))
    await ir(page, '/blog')
    await expect(page.getByRole('link', { name: /Cómo elegir un sofá/ })).toHaveAttribute('href', '/blog/sofa')
    await expect(page.getByText('12 sep 2026 · 5 min de lectura')).toBeVisible()
    await expect(page.getByRole('link', { name: /7 regalos hechos a mano/ })).toHaveAttribute('href', '/blog/regalos')
    // Los temas y el buscador del frame necesitan backend: no se dibujan chips ni etiquetas de diseño.
    await expect(page.getByText('NUEVO · temas')).toHaveCount(0)
  })

  test('artículo: texto con subtítulos, compartir y copiar enlace', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/blog/publico/sofa', (route) => json(route, {
      success: true,
      data: { ...ENTRADAS[0], contenido: '<p>Introducción.</p><h2>1. Elegí dos plazas</h2><p>Detalle.</p>' },
    }))
    await ir(page, '/blog/sofa')
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo elegir un sofá para una sala pequeña' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: '1. Elegí dos plazas' })).toBeVisible()
    await expect(page.getByText('Por HotClick')).toBeVisible()
    await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
    await expect(page.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', /facebook\.com\/sharer/)
    await expect(page.getByText('NUEVO · autor')).toHaveCount(0)
    await page.getByRole('button', { name: 'Copiar enlace' }).click()
    await expect(page.getByText(/Enlace copiado|No se pudo copiar el enlace/)).toBeVisible()
  })

  test('artículo inexistente ofrece volver al blog', async ({ page }) => {
    await sembrarCookies(page)
    await mockApisAcc(page)
    await page.route('**/api/blog/publico/nada', (route) => json(route, { success: false }, 404))
    await ir(page, '/blog/nada')
    await expect(page.getByRole('heading', { name: 'Artículo no encontrado' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver al blog' })).toHaveAttribute('href', '/blog')
  })
})
