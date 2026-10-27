import { test, expect, type Page, type Route } from '@playwright/test'
import { payloadAuth } from './seller-wizard-helpers'

/**
 * Captura de tarjeta durante el trial Emprendedor (ONVO). Todo mockeado con page.route y un window.onvo falso:
 * no toca ONVO ni el backend. La verificación contra el sandbox real de ONVO (modo TEST) es aparte.
 */
test.use(process.env.CI ? {} : { channel: 'chrome' })

type Escenario = {
  estadoPlan: 'TRIAL' | 'PENDIENTE_CUPO'
  trialDias?: number
  /** ¿ya hay tarjeta al entrar? Tras el POST (inicio del SDK) el servidor pasa a decir que sí está guardada. */
  tarjetaGuardada?: boolean
  getStatus?: number
}

const ok = (data: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

async function montar(page: Page, esc: Escenario, ruta = '/emprendedor/opciones/plan') {
  const llamadas = { get: 0, post: 0 }
  let guardada = esc.tarjetaGuardada ?? false
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    if (path.endsWith('/tenant/info')) {
      return route.fulfill(ok({
        planNombre: 'EMPRENDEDOR', estadoPlan: esc.estadoPlan, trialDias: esc.estadoPlan === 'TRIAL' ? (esc.trialDias ?? 5) : -1, features: {},
      }))
    }
    if (path.endsWith('/billing/trial/tarjeta')) {
      if (req.method() === 'POST') {
        llamadas.post++
        guardada = true // el SDK fake «guarda» la tarjeta al confirmar; el servidor lo refleja desde ahora
        return route.fulfill(ok({
          status: 'requiere_tarjeta', subscriptionId: 'sub_e2e', customerId: 'cus_e2e', publishableKey: 'clave-publica-falsa-e2e', trialDias: esc.trialDias ?? 5,
        }))
      }
      llamadas.get++
      if (esc.getStatus && esc.getStatus !== 200) {
        return route.fulfill({ status: esc.getStatus, contentType: 'application/json', body: JSON.stringify({ error: 'x' }) })
      }
      return route.fulfill(ok({ elegible: true, tarjetaGuardada: guardada, trialDias: esc.trialDias ?? 5 }))
    }
    if (path.endsWith('/public/emprende/cupos')) {
      return route.fulfill(ok({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 9.99 }))
    }
    if (path.endsWith('/billing/planes')) return route.fulfill(ok([]))
    return route.fulfill(ok([]))
  })
  await page.addInitScript((auth) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
    // SDK de ONVO falso: render() pone un marcador y submitPayment() confirma la tarjeta.
    ;(window as unknown as Record<string, unknown>).onvo = {
      pay: (opts: { onSuccess: (d: unknown) => void }) => ({
        render: (sel: string) => { const el = document.querySelector(sel); if (el) el.innerHTML = '<div data-testid="onvo-fake">ONVO</div>' },
        submitPayment: () => opts.onSuccess({}),
      }),
    }
  }, payloadAuth())
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  return llamadas
}

test.describe('Trial Emprendedor · captura de tarjeta', () => {
  test('en trial sin tarjeta muestra los días y «Agregar tarjeta»; al guardarla pasa a «guardada» y oculta el botón', async ({ page }) => {
    const llamadas = await montar(page, { estadoPlan: 'TRIAL', trialDias: 5, tarjetaGuardada: false })
    const card = page.getByTestId('trial-tarjeta')
    await expect(card).toHaveAttribute('data-estado', 'agregar')
    await expect(page.getByTestId('trial-tarjeta-dias')).toContainText('5 días')
    await expect(card).toContainText('US$9.99')
    await expect(card).not.toContainText('₡')

    await page.getByTestId('trial-tarjeta-agregar').click()
    await expect(page.getByTestId('onvo-fake')).toBeVisible()
    expect(llamadas.post).toBe(1)

    await page.getByTestId('trial-tarjeta').getByRole('button', { name: /^Guardar tarjeta$/ }).click()
    await expect(card).toHaveAttribute('data-estado', 'guardada')
    await expect(page.getByTestId('trial-tarjeta-agregar')).toHaveCount(0)
  })

  test('también aparece en el menú principal del emprendedor', async ({ page }) => {
    await montar(page, { estadoPlan: 'TRIAL', trialDias: 2, tarjetaGuardada: false }, '/emprendedor')
    await expect(page.getByTestId('trial-tarjeta')).toHaveAttribute('data-estado', 'agregar')
    await expect(page.getByTestId('trial-tarjeta-dias')).toContainText('2 días')
  })

  test('con la tarjeta ya guardada no hay botón «Agregar tarjeta»', async ({ page }) => {
    await montar(page, { estadoPlan: 'TRIAL', trialDias: 3, tarjetaGuardada: true })
    await expect(page.getByTestId('trial-tarjeta')).toHaveAttribute('data-estado', 'guardada')
    await expect(page.getByTestId('trial-tarjeta-agregar')).toHaveCount(0)
  })

  test('PENDIENTE_CUPO: avisa que se espera el cupo y no ofrece tarjeta', async ({ page }) => {
    const llamadas = await montar(page, { estadoPlan: 'PENDIENTE_CUPO' })
    await expect(page.getByTestId('trial-tarjeta')).toHaveAttribute('data-estado', 'espera_cupo')
    await expect(page.getByTestId('trial-tarjeta-agregar')).toHaveCount(0)
    expect(llamadas.get).toBe(0)
    expect(llamadas.post).toBe(0)
  })

  test('si el servidor no puede verificar la tarjeta (503) no ofrece el botón (fail-closed)', async ({ page }) => {
    await montar(page, { estadoPlan: 'TRIAL', trialDias: 5, getStatus: 503 })
    await expect(page.getByTestId('trial-tarjeta')).toHaveAttribute('data-estado', 'no_verificable')
    await expect(page.getByTestId('trial-tarjeta-agregar')).toHaveCount(0)
  })
})
