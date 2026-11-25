import { test, expect } from '@playwright/test'
import { json, prepararNavegador, SIN_DATOS } from '../helpers/agenteFixtures'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/** Cuerpo SSE del chat público, tal como lo arma el backend (Claude va mockeado: no hay llamada real). */
function sse(eventos: Array<[string, unknown]>) {
  return eventos.map(([nombre, datos]) => `event: ${nombre}\ndata: ${JSON.stringify(datos)}\n\n`).join('')
}

const PRODUCTO = { id: 10, nombre: 'Taza azul', precio: 5000, stock: 20 }

test.describe('Asesor web en la tienda', () => {
  test('responde por streaming y ofrece agregar al carrito solo al apretar el botón', async ({ page }) => {
    const mensajes: string[] = []
    await prepararNavegador(page)
    await page.route('**/api/public/chat**', async (route) => {
      mensajes.push((route.request().postDataJSON() as { message: string }).message)
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([
          ['products', { productos: [PRODUCTO] }],
          ['delta', { text: 'Te recomiendo la taza azul.' }],
          ['done', { opts: [], acciones: [{ tipo: 'AGREGAR_CARRITO', productoId: 10, cantidad: 2 }] }],
        ]),
      })
    })
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/api/public/chat')) return route.fallback()
      return json(route, SIN_DATOS)
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos?ai=1', { waitUntil: 'domcontentloaded' })

    const hoja = page.getByRole('dialog', { name: 'Asistente HotClick' })
    await expect(hoja).toBeVisible()
    await hoja.getByPlaceholder('¿Qué estás buscando?').fill('Busco una taza')
    await hoja.getByRole('button', { name: 'Enviar' }).click()

    await expect(hoja.getByText('Te recomiendo la taza azul.')).toBeVisible()
    expect(mensajes).toEqual(['Busco una taza'])

    // Nada se agrega solo: el carrito empieza vacío y cambia únicamente al apretar el botón de la acción.
    const carrito = () => page.evaluate(() => localStorage.getItem('hotclick-cart') ?? '')
    expect(await carrito()).not.toContain('Taza azul')
    const boton = hoja.getByRole('button', { name: 'Agregar 2 × Taza azul al carrito' })
    await expect(boton).toBeVisible()
    await boton.click()
    await expect(hoja.getByRole('button', { name: 'Agregado al carrito' })).toBeDisabled()
    await expect.poll(carrito).toContain('Taza azul')
  })

  test('cupo diario agotado: aviso amable, no un error para reintentar', async ({ page }) => {
    await prepararNavegador(page)
    await page.route('**/api/public/chat**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sse([['error', { limite: true, error: 'Llegaste al límite de consultas de hoy.' }]]),
      })
    })
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/api/public/chat')) return route.fallback()
      return json(route, SIN_DATOS)
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos?ai=1', { waitUntil: 'domcontentloaded' })

    const hoja = page.getByRole('dialog', { name: 'Asistente HotClick' })
    await hoja.getByPlaceholder('¿Qué estás buscando?').fill('Hola')
    await hoja.getByRole('button', { name: 'Enviar' }).click()
    await expect(hoja.getByText('Llegaste al límite de consultas de hoy.')).toBeVisible()
  })
})
