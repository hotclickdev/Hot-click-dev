import { test, expect } from '@playwright/test'

/**
 * S3 stub — login 2FA (email OTP / WebAuthn).
 * SKIP a propósito: fuera de `test:e2e:ci`. No implementar el flujo aquí.
 */
test.describe.skip('pending — auth 2FA', () => {
  test('login con 2FA pide OTP antes de entrar al admin', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /iniciar sesión|login/i })).toBeVisible()
  })
})
