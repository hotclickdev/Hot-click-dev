import { test, expect, type Page } from '@playwright/test'
import { json, prepararNavegador, sesionAdmin, sesionVendedor, SIN_DATOS, TENANT_PYME } from '../helpers/agenteFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ID = 'conv-prueba-1'

type Estado = { modo: 'BOT' | 'PERSONA'; asignadoAId: number | null; mensajes: Array<{ id: number; rol: string; texto: string; fecha: string }> }

function conversacion(e: Estado) {
  return {
    id: ID,
    canal: 'WHATSAPP',
    contacto: '***0000',
    modo: e.modo,
    estado: 'ABIERTA',
    asignadoAId: e.asignadoAId,
    asignadaAMi: e.asignadoAId === 1,
    ultimoMensaje: e.mensajes[e.mensajes.length - 1]?.texto ?? null,
    ultimoMensajeEn: '2026-01-01T12:00:00Z',
    ventanaAbierta: true,
    ventanaVenceEn: '2099-01-01T00:00:00Z',
    notaEncuesta: null,
    cupoAgotado: false,
  }
}

/** Bandeja con estado en memoria: pausar, asignar y responder cambian lo que devuelve el "servidor". */
async function mockBandeja(page: Page, llamadas: string[]) {
  const estado: Estado = {
    modo: 'BOT',
    asignadoAId: null,
    mensajes: [
      { id: 1, rol: 'user', texto: 'Hola, quiero una taza', fecha: '2026-01-01T11:59:00Z' },
      { id: 2, rol: 'assistant', texto: 'Con gusto, te ayudo con la taza.', fecha: '2026-01-01T12:00:00Z' },
    ],
  }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    if (path.includes('/tenant/info')) return json(route, TENANT_PYME)
    if (!path.startsWith('/bandeja')) return json(route, SIN_DATOS)

    if (req.method() === 'POST') {
      llamadas.push(`${path} ${req.postData() ?? ''}`.trim())
      if (path.endsWith('/pausar')) estado.modo = 'PERSONA'
      if (path.endsWith('/asignar')) estado.asignadoAId = (req.postDataJSON() as { usuarioId: number }).usuarioId
      if (path.endsWith('/responder')) {
        const { texto } = req.postDataJSON() as { texto: string }
        estado.mensajes.push({ id: 3, rol: 'persona', texto, fecha: '2026-01-01T12:05:00Z' })
        return json(route, estado.mensajes[estado.mensajes.length - 1])
      }
      return json(route, conversacion(estado))
    }
    if (path === '/bandeja/resumen') return json(route, { asignadasAMi: 0, sinAsignar: 1 })
    if (path === '/bandeja/equipo') return json(route, [{ id: 1, nombre: 'Ana Prueba' }, { id: 2, nombre: 'Luis Prueba' }])
    if (path.endsWith('/mensajes')) return json(route, { conversacion: conversacion(estado), mensajes: estado.mensajes })
    return json(route, { items: [conversacion(estado)], pagina: 0, tamano: 20, total: 1, hayMas: false })
  })
}

test.describe('Bandeja de los bots (/plataforma/bandeja)', () => {
  test('lista, pausa el bot, asigna y responde', async ({ page }) => {
    const llamadas: string[] = []
    await prepararNavegador(page, sesionAdmin())
    await mockBandeja(page, llamadas)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/plataforma/bandeja', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Bandeja', level: 1 })).toBeVisible()
    const fila = page.getByRole('list', { name: 'Conversaciones' }).getByRole('button')
    await expect(fila).toHaveCount(1)
    await expect(fila).toContainText('***0000')
    await expect(fila).toContainText('Con gusto, te ayudo con la taza.')

    await fila.click()
    const hilo = page.getByRole('log', { name: 'Mensajes de la conversación' })
    await expect(hilo).toContainText('Hola, quiero una taza')

    // Pausar el bot: pasa a atender una persona.
    await page.getByRole('button', { name: 'Pausar bot' }).click()
    await expect(page.getByRole('button', { name: 'Devolver al bot' })).toBeVisible()
    expect(llamadas.some((l) => l.startsWith(`/bandeja/${ID}/pausar`))).toBe(true)

    // Asignar a una persona del equipo.
    await page.getByLabel('Asignar a').selectOption({ label: 'Luis Prueba' })
    await page.getByRole('button', { name: 'Asignar', exact: true }).click()
    await expect.poll(() => llamadas.find((l) => l.startsWith(`/bandeja/${ID}/asignar`))).toContain('"usuarioId":2')

    // Responder como persona.
    await page.getByLabel('Responder', { exact: true }).fill('Ya te preparo el enlace de compra.')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(hilo).toContainText('Ya te preparo el enlace de compra.')
    expect(llamadas.some((l) => l.startsWith(`/bandeja/${ID}/responder`))).toBe(true)
  })
})

test.describe('Bandeja en el área del vendedor (/pyme/bandeja)', () => {
  test('el dueño del negocio ve sus conversaciones', async ({ page }) => {
    await prepararNavegador(page, sesionVendedor())
    await mockBandeja(page, [])
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pyme/bandeja', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Bandeja', level: 1 })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Conversaciones' }).getByRole('button')).toHaveCount(1)
  })
})
