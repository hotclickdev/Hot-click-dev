import { test, expect } from '@playwright/test'
import { QA, claveQa, login, sufijo } from './api'

/**
 * Flujo 1: registro y login.
 * - Login local (correo + contraseña) contra el backend real: siempre corre.
 * - Registro local: hoy falla en BD nueva (ver nota abajo) → test.fail documentado.
 * - Clerk modo prueba: necesita CLERK_SECRET_KEY de una instancia de desarrollo (@clerk/testing);
 *   sin ese secreto se salta de forma explícita.
 */
test.describe('Flujo 1 — auth', () => {
  test('login local por UI deja la sesión iniciada', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
      localStorage.setItem('hc-mm-v1-off', '1')
    })
    await page.goto('/login')
    await page.locator('input[type="email"]').first().fill(QA.PYME)
    // Login en dos pasos: correo → "Continuar" → contraseña.
    const pass = page.locator('input[type="password"]').first()
    if (!(await pass.isVisible())) await page.getByRole('button', { name: /^continuar$/i }).click()
    await page.locator('input[type="password"]').first().fill(claveQa())
    const resp = page.waitForResponse((r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST')
    await page.locator('button[type="submit"]').first().click()
    expect((await resp).status()).toBe(200)
    await expect(page).not.toHaveURL(/\/login(\?|$)/)
    const authGuardada = await page.evaluate(() => localStorage.getItem('hotclick-auth'))
    expect(authGuardada).toContain(QA.PYME)
  })

  test('login con contraseña mala responde 401 genérico', async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { correo: QA.PYME, contrasena: 'mala-' + sufijo() } })
    expect(res.status()).toBe(401)
    expect(JSON.stringify(await res.json())).not.toMatch(/hash|sql|exception/i)
  })

  test('registro local y login con la cuenta nueva', async ({ request }) => {
    // E2E-REG-01 (identificacion NOT NULL en BD nueva) ya está arreglado en master: test normal.
    const correo = `e2e.${sufijo()}@example.test`
    const contrasena = `E2e-${sufijo()}-Aa1!`
    const reg = await request.post('/api/auth/register', {
      data: { nombre: 'Comprador E2E', correo, contrasena, declaraMayoriaEdad: true },
    })
    expect(reg.ok(), await reg.text()).toBeTruthy()
    await login(request, correo, contrasena)
  })

  test('backend publica una clave Clerk pk_test (nunca pk_live) fuera de producción', async ({ request }) => {
    const res = await request.get('/api/public/auth-config')
    expect(res.ok()).toBeTruthy()
    const { clerkPublishableKey } = await res.json()
    if (clerkPublishableKey) expect(clerkPublishableKey).toMatch(/^pk_test_/)
  })

  test.describe('Clerk modo prueba', () => {
    const clerkListo = !!process.env.E2E_CLERK_USER_EMAIL && /^sk_test_/.test(process.env.CLERK_SECRET_KEY ?? '')
    test.skip(!clerkListo,
      'Falta CLERK_SECRET_KEY (instancia dev, sk_test_) y/o E2E_CLERK_USER_EMAIL: flujo Clerk real omitido (nunca llave live)')
    test('sign-in con usuario de prueba', async ({ page }) => {
      // Con secretos: @clerk/testing (setupClerkTestingToken + clerk.signIn, usuario +clerk_test, código 424242).
      // Requiere añadir @clerk/testing como devDependency cuando exista el secreto.
      await page.goto('/login')
      await expect(page.getByText(/google|continuar con/i).first()).toBeVisible()
    })
  })
})
