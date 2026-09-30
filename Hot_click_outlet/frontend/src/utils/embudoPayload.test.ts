import { describe, expect, it } from 'vitest'
import { armarPayloadEmbudo, motivoBloqueoCheckout } from '@/utils/embudoPayload'

const UUID = '11111111-1111-4111-8111-111111111111'

describe('armarPayloadEmbudo', () => {
  it('arma el cuerpo con paso y motivo', () => {
    expect(armarPayloadEmbudo(UUID, 'CHECKOUT', 'ERROR_DATOS', 15000)).toEqual({
      sessionKey: UUID,
      paso: 'CHECKOUT',
      motivo: 'ERROR_DATOS',
      monto: 15000,
    })
  })

  it('rechaza un correo y un paso desconocido', () => {
    expect(armarPayloadEmbudo('ana@hotclick.com', 'VISITA', null, null)).toBeNull()
    expect(armarPayloadEmbudo('no-es-uuid', 'VISITA', null, null)).toBeNull()
    expect(armarPayloadEmbudo(UUID, 'OTRO', null, null)).toBeNull()
    expect(armarPayloadEmbudo(UUID, 'VISITA', 'CORREO', null)).toBeNull()
  })

  it('traduce el paso del checkout al motivo, sin el texto que escribió la persona', () => {
    expect(motivoBloqueoCheckout(1)).toBe('ERROR_DATOS')
    expect(motivoBloqueoCheckout(2)).toBe('ERROR_ENTREGA')
    expect(motivoBloqueoCheckout(3)).toBe('SIN_COMPROBANTE')
  })
})
