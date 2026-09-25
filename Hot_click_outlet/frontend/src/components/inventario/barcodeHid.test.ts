import { describe, expect, it } from 'vitest'
import { normalizarCodigoBarras } from './barcodeHid'

describe('normalizarCodigoBarras', () => {
  it('acepta EAN-13 típico', () => {
    expect(normalizarCodigoBarras('7501234567890')).toBe('7501234567890')
  })

  it('recorta espacios', () => {
    expect(normalizarCodigoBarras('  7501234567890\n')).toBe('7501234567890')
  })

  it('compacta espacios y guiones', () => {
    expect(normalizarCodigoBarras('750 1234-567890')).toBe('7501234567890')
  })

  it('rechaza vacío o demasiado corto', () => {
    expect(normalizarCodigoBarras('')).toBeNull()
    expect(normalizarCodigoBarras('12')).toBeNull()
  })
})
