import { describe, expect, it } from 'vitest'
import { MONTO_POR_DEFINIR, normalizarTarifas, textoContraEntrega, textoCosto } from './enviosApi'

const fmt = (n: number) => `₡${n}`
describe('S6-21 página de envíos', () => {
  it('sin monto del backend dice «Monto a definir por HOT_CLICK» (nunca inventa)', () => {
    expect(textoCosto({ montoDesde: null, montoHasta: null, sumaTarifaCourier: false }, fmt)).toBe(MONTO_POR_DEFINIR)
    expect(normalizarTarifas({}).contraEntrega.cargo).toBeNull()
  })
  it('rango por zona y suma del courier', () => {
    expect(textoCosto({ montoDesde: 1, montoHasta: 2, sumaTarifaCourier: false }, fmt)).toBe('₡1 a ₡2 según la zona')
    expect(textoCosto({ montoDesde: 1, montoHasta: null, sumaTarifaCourier: true }, fmt)).toBe('₡1 + la tarifa del courier (la pagás vos)')
  })
  it('normaliza y descarta montos inválidos', () => {
    const t = normalizarTarifas({ data: { opciones: [{ clave: 'n', nombre: 'Envío normal', montoDesde: -5, contraEntrega: 'SI' }, { nombre: 'sin clave' }], contraEntrega: { cargo: 9 } } })
    expect(t.opciones).toHaveLength(1)
    expect(t.opciones[0].montoDesde).toBeNull()
    expect(t.cobroPorNegocio).toBe(true)
    expect(t.contraEntrega.cargo).toBe(9)
    expect(textoContraEntrega('POR_CONFIRMAR')).toBe('Por confirmar')
  })
})
