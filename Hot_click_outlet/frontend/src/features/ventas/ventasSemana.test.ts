import { describe, expect, it } from 'vitest'
import { explicacionMinimo, lunesDe, mensajeErrorVentas, normalizarSemana } from './ventasSemanaApi'

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

  it('#203: sin plan los valores llegan null y no se muestran como ₡0', () => {
    const s = normalizarSemana({ data: { desde: '2026-10-12', hasta: '2026-10-18', porcentaje: null, minimoComision: null, ventas: [{ id: 81, fecha: '2026-10-14T09:00', producto: 'Venta pedido ORD-1', bruto: 4000, comisionPorcentaje: null, minimoAplicado: false, comision: 800, neto: 3200 }], totales: { bruto: 4000, comision: 800, neto: 3200, conMinimo: 0, cantidad: 1 } } })
    expect(s.ventas[0].comisionPorcentaje).toBeNull()
    expect(s.porcentaje).toBeNull()
    expect(explicacionMinimo(5, 0, (v) => `₡${v}`)).toBeNull()
  })

  it('#203: 403 de una cuenta sin negocio', () => {
    expect(mensajeErrorVentas({ response: { status: 403 } })).toBe('Esta sección es solo para cuentas de negocio.')
    expect(mensajeErrorVentas(new Error('red'))).toContain('No pudimos cargar tus ventas')
  })

  it('#203 (3da61998c): producto null y minimoComision tal cual del plan', () => {
    const s = normalizarSemana({ data: { porcentaje: 5, minimoComision: 700, ventas: [{ id: 1, producto: null, bruto: 4000, comisionPorcentaje: 200, minimoAplicado: true, comision: 700, neto: 3300 }, { id: 2, producto: 'Café de altura y 1 más', bruto: 1 }], totales: {} } })
    expect(s.ventas[0].producto).toBeNull()
    expect(s.ventas[1].producto).toBe('Café de altura y 1 más')
    expect(s.minimoComision).toBe(700)
    expect(normalizarSemana({ data: { minimoComision: 850, ventas: [], totales: {} } }).minimoComision).toBe(850)
  })
})
