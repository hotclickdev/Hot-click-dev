import { describe, expect, it } from 'vitest'
import { FORM_PEDIDO_INICIAL, payloadPedidoManual } from './ordenesHelpers'

describe('P-07 · pedido manual sin bodega fija', () => {
  it('no manda bodegaId=1; el backend resuelve la bodega del negocio', () => {
    const payload = payloadPedidoManual({ ...FORM_PEDIDO_INICIAL, usuarioId: '5', items: [] }, 0)
    expect(payload).not.toHaveProperty('bodegaId')
    expect(payload.usuarioId).toBe(5)
  })
})
