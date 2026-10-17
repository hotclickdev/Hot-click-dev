import { describe, expect, it } from 'vitest'
import { normalizarPago } from './pagoPendienteApi'
import { TEXTOS_PAGO_PENDIENTE, textoAvisoCorreo, textoProductos, textoReservadoHasta } from './textosPagoPendiente'

describe('S4-22 pago pendiente SINPE', () => {
  it('normaliza la respuesta y deja el plazo sin inventar', () => {
    const p = normalizarPago({ data: { estado: 'PENDIENTE', numero: 'HC-1', tienda: 'Sofi', subtotal: 100, envio: 50, total: 150 } })
    expect(p.reservadoHasta).toBeNull()
    expect(p.total).toBe(150)
    expect(normalizarPago({ estado: 'RARO' }).estado).toBe('PENDIENTE')
    expect(Object.values(TEXTOS_PAGO_PENDIENTE).join(' ')).not.toMatch(/\d+\s*(min|hora|día)/)
  })
  it('en vencido dice que no hubo cobro y que el carrito sigue', () => {
    expect(TEXTOS_PAGO_PENDIENTE.vencidoTexto).toMatch(/ningún cobro.*carrito/)
  })
  it('textos de correo y productos', () => {
    expect(textoAvisoCorreo('a@b.com')).toBe('a a@b.com apenas ONVO confirme el pago.')
    expect(textoAvisoCorreo(null)).toBe('apenas ONVO confirme el pago.')
    expect(textoProductos(1)).toBe('1 producto')
    expect(textoProductos(3)).toBe('3 productos')
  })

  it('#207: reservadoHasta con zona se muestra en hora CR; 404 tiene texto fijo', () => {
    expect(textoReservadoHasta('2026-10-16T22:30:00-06:00')).toMatch(/2026/)
    expect(normalizarPago({ data: { estado: 'VENCIDO', reservadoHasta: null } }).reservadoHasta).toBeNull()
    expect(TEXTOS_PAGO_PENDIENTE.enlaceInvalido).toBe('No encontramos un pedido con este enlace.')
  })
})
