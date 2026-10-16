import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PLACEHOLDER_BANNER, PLACEHOLDER_LOGO } from './datosNegocioHelpers'

describe('Datos del negocio sin archivos de demo (NP-9)', () => {
  it('no muestra logo-qa2 ni banner-qa2 y usa el texto neutro', () => {
    const src = readFileSync(fileURLToPath(new URL('./DatosNegocioPage.tsx', import.meta.url)), 'utf8')
    expect(src).not.toMatch(/logo-qa2|banner-qa2/)
    expect(src).toContain('PLACEHOLDER_LOGO')
    expect(PLACEHOLDER_LOGO).not.toMatch(/\.(png|jpe?g)$/)
    expect(PLACEHOLDER_BANNER).not.toMatch(/\.(png|jpe?g)$/)
  })
})

describe('errorWhatsappNegocio (Pyme)', () => {
  it('rechaza texto y acepta 8 dígitos con o sin +506', async () => {
    const { errorWhatsappNegocio } = await import('./datosNegocioHelpers')
    expect(errorWhatsappNegocio('QA-TEST abc')).not.toBeNull()
    expect(errorWhatsappNegocio('8888')).not.toBeNull()
    expect(errorWhatsappNegocio('+506 8888-1234')).toBeNull()
    expect(errorWhatsappNegocio('')).toBeNull()
  })
})
