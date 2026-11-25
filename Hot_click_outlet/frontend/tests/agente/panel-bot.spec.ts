import { test, expect, type Page } from '@playwright/test'
import { json, prepararNavegador, sesionVendedor, SIN_DATOS, TENANT_PYME } from '../helpers/agenteFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const CONFIG = {
  nombreBot: 'Asistente Demo',
  trato: 'TUTEO',
  emojis: false,
  activo: true,
  horarioActivo: false,
  horario: DIAS.map((dia) => ({ dia, abierto: true, desde: '08:00', hasta: '18:00' })),
  mensajeFueraHorario: null,
  zona: 'America/Costa_Rica',
}

/** El panel entero habla con /api/agente/*: Claude, Meta y ONVO nunca se tocan (el simulador es otro mock). */
async function mockPanel(page: Page, guardados: unknown[], simulados: unknown[]) {
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    if (path.includes('/tenant/info')) return json(route, TENANT_PYME)
    if (path === '/agente/uso') {
      return json(route, { mes: '2026-01', conversaciones: 40, cupo: 100, costoUsd: 1.5, topeUsd: 10, agenteIncluido: true })
    }
    if (path === '/agente/config' && req.method() === 'PUT') {
      guardados.push(req.postDataJSON())
      return json(route, CONFIG)
    }
    if (path === '/agente/config') return json(route, CONFIG)
    if (path === '/agente/canales') {
      return json(route, [{ id: 5, tipo: 'WHATSAPP', nombre: 'Canal de prueba', estado: 'ACTIVA', tieneToken: true }])
    }
    if (path === '/agente/simulador') {
      simulados.push(req.postDataJSON())
      return json(route, { texto: 'Claro, tenemos envíos a todo el país.', pasoAPersona: false, motivoFin: 'FIN', tokensEntrada: 1, tokensSalida: 1 })
    }
    return json(route, SIN_DATOS)
  })
}

/**
 * HALLAZGO AG-33: BotPage solo está montada en sellerAdminRoutes.tsx, que ninguna ruta usa (el menú del vendedor
 * apunta a /pyme/bot y /pyme/bandeja, que no existen en SellerRoutes: pantalla en blanco). Hasta que se monte,
 * estos flujos no se pueden recorrer en el navegador; se dejan como fixme con su mock listo, no se borran.
 */
test.describe('Panel del bot (/pyme/bot)', () => {
  test.fixme(true, 'BotPage no está montada en ninguna ruta del vendedor (ver comentario)')

  test('muestra uso del mes, guarda configuración, lista canales y simula una conversación', async ({ page }) => {
    const guardados: unknown[] = []
    const simulados: unknown[] = []
    await prepararNavegador(page, sesionVendedor())
    await mockPanel(page, guardados, simulados)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pyme/bot', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Bot de ventas', level: 1 })).toBeVisible()
    await expect(page.getByText('40 de 100 conversaciones del cupo de tu plan.')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Cupo de conversaciones usado' })).toHaveAttribute('aria-valuenow', '40')

    // Configuración: cambiar el nombre y guardar.
    await expect(page.getByRole('tab', { name: 'Configuración' })).toHaveAttribute('aria-selected', 'true')
    const nombre = page.getByLabel('Nombre del bot', { exact: false }).first()
    await nombre.fill('Asistente Nuevo')
    await page.getByRole('button', { name: 'Guardar', exact: false }).first().click()
    await expect(page.getByText('Listo, guardamos la configuración.')).toBeVisible()
    expect(JSON.stringify(guardados[0])).toContain('Asistente Nuevo')

    // Canales.
    await page.getByRole('tab', { name: 'Canales' }).click()
    await expect(page.getByRole('list', { name: 'Canales conectados' })).toContainText('Canal de prueba')

    // Simulador: la respuesta viene del mock, no de Claude.
    await page.getByRole('tab', { name: 'Simulador' }).click()
    await page.getByPlaceholder('Ej: ¿Tienen envíos a Cartago?').fill('¿Hacen envíos?')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('log', { name: 'Conversación de prueba' })).toContainText('Claro, tenemos envíos a todo el país.')
    expect(simulados).toHaveLength(1)
  })

  test('con el cupo agotado avisa que los chats pasan al equipo', async ({ page }) => {
    await prepararNavegador(page, sesionVendedor())
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
      if (path.includes('/tenant/info')) return json(route, TENANT_PYME)
      if (path === '/agente/uso') {
        return json(route, { mes: '2026-01', conversaciones: 100, cupo: 100, costoUsd: 3, topeUsd: null, agenteIncluido: true })
      }
      if (path === '/agente/config') return json(route, CONFIG)
      return json(route, SIN_DATOS)
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pyme/bot', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Llegaste al cupo de conversaciones del mes', { exact: false })).toBeVisible()
  })
})
