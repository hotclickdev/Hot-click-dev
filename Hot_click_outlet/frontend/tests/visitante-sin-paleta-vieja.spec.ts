import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Fase 2 (alineación total con Figma): las pantallas de visitante ya rediseñadas no vuelven a la paleta
 * vieja (`--hc-accent`, `--hc-surface*`, `--hc-muted`, `--hc-text`, `--hc-border`, `--hc-bg`, ámbar).
 * Los archivos COMPARTIDOS con variante (`PiezasModalCuenta`, `ChangePasswordModal`, `TwoFAModal`, `Spinner`) no van acá: conservan la rama vieja.
 */
const dir = dirname(fileURLToPath(import.meta.url))
const PALETA_VIEJA = /var\(--hc-(accent|surface|surface-2|surface-3|muted|text|border|bg)\)|amber-|#f59e0b|#fbbf24/

const ARCHIVOS = [
  'pages/descubri/DescubriError.tsx',
  'pages/descubri/DescubriLoading.tsx',
  'pages/descubri/DescubriRevelacion.tsx',
  'pages/descubri/DescubriResultados.tsx',
  'pages/servicios/TestimonioCard.tsx',
  'pages/servicios/StarPicker.tsx',
  'pages/catalogo/CatalogProductGrid.tsx',
  'pages/catalogo/CategoryRow.tsx',
  'pages/catalogo/ParentCategoryRow.tsx',
  'pages/SSOCallback.tsx',
  'pages/SSOComplete.tsx',
  'pages/devoluciones/devolucionesData.tsx',
  'pages/checkout/checkoutHelpers.ts',
  'components/auth/SocialLoginButtons.tsx',
  'components/auth/WebAuthnStep.tsx',
  'components/ai/ChatModal.tsx',
  'components/ai/AIChat.tsx',
  'components/ai/aiChat/AIChatViews.tsx',
  'components/ai/aiChat/useAiChat.ts',
  'components/ai/AICategoryChip.tsx',
]

for (const archivo of ARCHIVOS) {
  test(`${archivo} no usa la paleta vieja`, () => {
    expect(readFileSync(join(dir, '../src', archivo), 'utf8')).not.toMatch(PALETA_VIEJA)
  })
}

test('aviso de versión nueva en una ruta de visitante usa el estilo de Figma', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }))
  await page.goto('/terminos', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => globalThis.dispatchEvent(new Event('sw-update-available')))
  const aviso = page.getByRole('status').filter({ hasText: 'Hay una versión nueva de HotClick.' })
  await expect(aviso).toBeVisible()
  await expect(aviso.getByRole('button', { name: 'Actualizar' })).toHaveClass(/bg-hc-red-500/)
})
