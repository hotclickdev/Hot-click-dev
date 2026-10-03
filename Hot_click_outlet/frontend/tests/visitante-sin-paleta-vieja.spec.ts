import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Fase 2 (alineación total con Figma): las pantallas de visitante ya rediseñadas no vuelven a la paleta
 * vieja (`--hc-accent`, `--hc-surface*`, `--hc-muted`, `--hc-text`, `--hc-border`, `--hc-bg`, ámbar).
 * Los archivos COMPARTIDOS con variante (`PiezasModalCuenta`, `ChangePasswordModal`, `TwoFAModal`, `Spinner`) no van acá: conservan la rama vieja.
 * De `Modal`, `ConfirmModal`, `Toast`, `Input` y `Button` se revisa solo la rama `figma` (`TRAMOS_FIGMA`).
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
  // El aviso escucha el evento al montar: se dispara cuando la app ya pintó (si no, carrera con el montaje).
  await page.getByRole('banner').waitFor()
  await page.evaluate(() => globalThis.dispatchEvent(new Event('sw-update-available')))
  const aviso = page.getByRole('status').filter({ hasText: 'Hay una versión nueva de HotClick.' })
  await expect(aviso).toBeVisible()
  await expect(aviso.getByRole('button', { name: 'Actualizar' })).toHaveClass(/bg-hc-red-500/)
})

/** Rama Figma de las piezas COMPARTIDAS de `components/ui` (la rama clásica de los paneles conserva la paleta vieja). */
const TRAMOS_FIGMA: { archivo: string; desde: string; hasta: string }[] = [
  { archivo: 'components/ui/Modal.tsx', desde: 'function ModalFigma', hasta: 'function ModalClasico' },
  { archivo: 'components/ui/ConfirmModal.tsx', desde: "if (v === 'figma')", hasta: 'variante="clasica"' },
  { archivo: 'components/ui/Toast.tsx', desde: 'const ICONO_FIGMA', hasta: 'export function useToast' },
  { archivo: 'components/ui/Input.tsx', desde: 'const INPUT_FIGMA', hasta: '\n  return (' },
  { archivo: 'components/ui/Button.tsx', desde: 'const variantFigma', hasta: 'export type ButtonProps' },
  { archivo: 'components/ui/varianteVisitante.ts', desde: "if (variante === 'figma')", hasta: '\n  return {' },
]

for (const { archivo, desde, hasta } of TRAMOS_FIGMA) {
  test(`${archivo}: la rama figma no usa la paleta vieja`, () => {
    const texto = readFileSync(join(dir, '../src', archivo), 'utf8')
    const inicio = texto.indexOf(desde)
    expect(inicio, `falta «${desde}»`).toBeGreaterThan(-1)
    const fin = texto.indexOf(hasta, inicio + desde.length)
    expect(fin, `falta «${hasta}»`).toBeGreaterThan(inicio)
    expect(texto.slice(inicio, fin)).not.toMatch(PALETA_VIEJA)
    expect(texto.slice(inicio, fin)).not.toMatch(/hc-btn|hc-input(?!-libre)|hc-modal/)
  })
}

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

test('toast de una ruta de visitante (/encargo) usa la tarjeta blanca de Figma', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
  })
  await page.route('**/api/**', (route) => route.fulfill(json({ success: true, data: [] })))
  await page.route('**/api/public/encargos/tok', (route) => route.fulfill(json({ success: true, data: {
    id: 214, productoNombre: 'Taza personalizada', nombreCliente: 'María', modoPrecio: 'FIJO', estado: 'APROBADO',
    precioCotizado: 11000, tokenPublico: 'tok', fechaCreacion: '2026-09-22T10:14:00' } })))
  await page.route('**/api/public/encargos/tok/checkout', (route) => route.fulfill(json({ success: false, message: 'No pudimos iniciar el pago.' }, 400)))
  await page.goto('/encargo/tok', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Pagar/ }).click()
  const aviso = page.getByRole('alert').filter({ hasText: 'No pudimos iniciar el pago.' })
  await expect(aviso).toBeVisible()
  await expect(aviso).toHaveAttribute('data-variante', 'figma')
  await expect(aviso).toHaveClass(/bg-hc-n-0/)
  await expect(aviso).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('barra de navegación en una ruta de visitante es azul b600 sin brillo', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill(json({ success: true, data: [] })))
  await page.goto('/terminos', { waitUntil: 'domcontentloaded' })
  const barra = page.locator('[data-variante="figma"][aria-hidden]').first()
  await expect(barra).toBeAttached()
  await expect(barra).toHaveCSS('background-color', 'rgb(23, 71, 168)')
  await expect(barra).toHaveCSS('box-shadow', 'none')
})
