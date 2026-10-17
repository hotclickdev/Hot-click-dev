import { describe, expect, it } from 'vitest'
import { explicacionMinimo, lunesDe, normalizarSemana } from './ventasSemanaApi'

const fmt = (v: number) => `₡${v}`

describe('S4-23 panel de ventas', () => {
  it('usa los montos del backend', () => {
    const s = normalizarSemana({ data: { porcentaje: 9, minimoComision: 700, ventas: [{ id: 1, bruto: 5000, comisionPorcentaje: 450, minimoAplicado: true, comision: 700, neto: 4300 }], totales: { bruto: 5000, comision: 700, neto: 4300, conMinimo: 1 } } })
    expect(s.ventas[0].comision).toBe(700)
    expect(s.totales.cantidad).toBe(1)
    expect(normalizarSemana({}).minimoComision).toBeNull()
  })
  it('explica el mínimo con un ejemplo del % del plan, sin mínimo no inventa', () => {
    expect(explicacionMinimo(9, 700, fmt)).toContain('se cobra ₡700 por mínimo')
    expect(explicacionMinimo(null, 700, fmt)).toBe('Comisión mínima: ₡700 por venta. La paga el negocio.')
    expect(explicacionMinimo(9, null, fmt)).toBeNull()
  })
  it('semana desde el lunes', () => {
    expect(lunesDe(new Date(2026, 9, 16))).toBe('2026-10-12')
    expect(lunesDe(new Date(2026, 9, 16), -1)).toBe('2026-10-05')
  })
})
