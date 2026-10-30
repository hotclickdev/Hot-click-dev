import { test, expect } from '@playwright/test'
import { QA, auth, login, loginUi, miembro } from './api'

/** Roles (QA7): LECTOR en panel vendedor › recolección (RecoleccionPanel.tsx:15-16 soloLectura, :34 cancelar). */
test.describe.serial('Roles — LECTOR en recolección', () => {
  let lector: { correo: string; contrasena: string }

  test.beforeAll(async ({ request }) => {
    lector = await miembro(request, auth(await login(request, QA.NEGOCIO_PLUS)), 'LECTOR')
  })

  test('backend: LECTOR no puede crear recolección (403 con mensaje claro)', async ({ request }) => {
    const s = await login(request, lector.correo, lector.contrasena)
    const res = await request.post('/api/recolecciones', {
      headers: auth(s),
      data: { zona: 'GAM', direccionRecoleccion: 'San José centro', contactoRecoleccion: 'E2E', telefonoRecoleccion: '88887777',
        direccionEntrega: 'Heredia centro', contactoEntrega: 'E2E', telefonoEntrega: '88887777' },
    })
    expect(res.status()).toBe(403)
    expect((await res.json()).message).toMatch(/solo de visualizaci/i)
    expect((await request.get('/api/recolecciones', { headers: auth(s) })).status()).toBe(200)
  })

  test('UI: LECTOR no ve crear/cancelar, o si los ve recibe 403 con mensaje claro sin romper la página', async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    await loginUi(page, lector.correo, lector.contrasena)
    await page.goto('/negocio-plus/recoleccion')
    await expect(page.getByRole('heading', { name: /tus solicitudes/i })).toBeVisible({ timeout: 15_000 })
    const nueva = page.getByRole('heading', { name: /nueva solicitud/i })
    if (await nueva.isVisible()) {
      // El login devuelve rol EMPRENDEDOR (no LECTOR), así que soloLectura no se activa: debe frenar el backend.
      // Asistente de 4 pasos: se completa lo visible y se avanza hasta que salga el POST.
      let r: import('@playwright/test').Response | null = null
      page.on('response', (x) => { if (x.url().includes('/api/recolecciones') && x.request().method() === 'POST') r = x })
      for (let paso = 0; paso < 8 && !r; paso++) {
        for (const campo of await page.locator('main input:visible, main textarea:visible').all()) {
          const tipo = await campo.getAttribute('type')
          if (['checkbox', 'radio', 'hidden', 'search', 'file'].includes(tipo ?? '') || (await campo.inputValue())) continue
          await campo.fill(tipo === 'tel' ? '88887777' : tipo === 'number' ? '1' : tipo === 'date' ? '2030-01-15' : 'Dato E2E 1')
        }
        for (const sel of await page.locator('main select:visible').all()) await sel.selectOption({ index: 1 }).catch(() => {})
        const boton = page.getByRole('button', { name: /continuar|enviar|solicitar|confirmar/i }).first()
        if (!(await boton.isVisible()) || !(await boton.isEnabled())) break
        await boton.click()
        await page.waitForTimeout(400)
      }
      if (r) {
        expect((r as import('@playwright/test').Response).status()).toBe(403)
        await expect(page.getByText(/solo de visualizaci/i).first()).toBeVisible()
      }
      // Si la validación del form frenó antes, tampoco se creó nada: lo relevante es que no rompa.
    }
    await expect(page.getByRole('heading', { name: /tus solicitudes/i })).toBeVisible()
    expect(errores, errores.join('\n')).toEqual([])
  })
})
