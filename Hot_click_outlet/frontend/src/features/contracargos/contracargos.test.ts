import { describe, expect, it } from 'vitest'
import { cuentaRegresiva, normalizarContracargo, pruebaValida, textoRetencion } from './contracargosApi'

describe('S5-23 contracargos', () => {
  it('cuenta regresiva del plazo de ONVO', () => {
    const ahora = Date.parse('2026-11-17T09:18:00Z')
    expect(cuentaRegresiva('2026-11-19T14:30:00Z', ahora)).toBe('2 d 05 h 12 min')
    expect(cuentaRegresiva('2026-11-16T00:00:00Z', ahora)).toBeNull()
  })
  it('retención informada por ONVO; sin dato no inventa', () => {
    expect(textoRetencion({ monto: 45, moneda: 'USD' }, String)).toBe('US$45')
    expect(textoRetencion(null, String)).toBe('monto a definir por HOT_CLICK')
    expect(normalizarContracargo({ estado: 'X' }).estado).toBe('ABIERTO')
  })
  it('solo PDF o imagen', () => {
    expect(pruebaValida({ type: 'application/pdf' })).toBe(true)
    expect(pruebaValida({ type: 'application/zip' })).toBe(false)
  })
})
