import { describe, expect, it } from 'vitest'
import { normalizarResumen, resumenVisible } from './resumenLegalApi'

describe('S5-24 resumen legal', () => {
  it('oculto hasta que Legal lo aprueba', () => {
    expect(resumenVisible(normalizarResumen({ aprobado: false, puntos: ['a'] }))).toBe(false)
    expect(resumenVisible(normalizarResumen({ data: { aprobado: true, puntos: ['a', ''] } }))).toBe(true)
    expect(resumenVisible(normalizarResumen({ aprobado: true, puntos: [] }))).toBe(false)
    expect(resumenVisible(null)).toBe(false)
  })
})
