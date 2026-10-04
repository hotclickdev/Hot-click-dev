import { describe, expect, it } from 'vitest'
import { montoCobroServidor, tilopayCardDesdePago } from '@/hooks/usePayment'

describe('tilopayCardDesdePago', () => {
  it('usa el monto y CRC que devolvió el servidor', () => {
    const payload = tilopayCardDesdePago({
      sdkToken: 'tok',
      numeroPedido: 'ORD-1',
      total: 15000,
      moneda: 'CRC',
      orderNumber: 'ORD-1',
    })
    expect(payload?.monto).toBe(15000)
    expect(payload?.moneda).toBe('CRC')
    expect(payload?.orderNumber).toBe('ORD-1')
  })

  it('no arma el formulario si falta el monto o la moneda no es CRC', () => {
    expect(montoCobroServidor({ total: 0, sdkToken: 'tok' })).toBeNull()
    expect(tilopayCardDesdePago({ sdkToken: 'tok', numeroPedido: 'ORD-1' })).toBeNull()
    expect(tilopayCardDesdePago({
      sdkToken: 'tok',
      numeroPedido: 'ORD-1',
      total: 1000,
      moneda: 'USD',
    })).toBeNull()
  })
})
