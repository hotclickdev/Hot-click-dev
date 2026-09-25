import { describe, expect, it, vi } from 'vitest'
import {
  codigoTilopayOk,
  motivoDesdeParams,
  numeroPedidoTilopay,
  paramsDesdeSearch,
  resolverRespuestaTilopay,
} from '@/pages/checkout/tilopayRespuestaHelpers'

describe('tilopayRespuestaHelpers', () => {
  it('parsea query params del redirect', () => {
    const params = paramsDesdeSearch('?code=1&order=HC-100&description=OK')
    expect(params.code).toBe('1')
    expect(numeroPedidoTilopay(params)).toBe('HC-100')
    expect(motivoDesdeParams(params)).toBe('OK')
  })

  it('reconoce códigos de éxito Tilopay', () => {
    expect(codigoTilopayOk('1')).toBe(true)
    expect(codigoTilopayOk('00')).toBe(true)
    expect(codigoTilopayOk('2')).toBe(false)
  })

  it('navega a éxito cuando confirmarTilopay reporta CAPTURADO', async () => {
    const confirmar = vi.fn().mockResolvedValue({ data: { estadoPago: 'CAPTURADO' } })
    const result = await resolverRespuestaTilopay('?code=1&order=HC-9', confirmar)
    expect(confirmar).toHaveBeenCalledWith('HC-9', expect.objectContaining({ code: '1', order: 'HC-9' }))
    expect(result.destino).toBe('exito')
    expect(result.numeroPedido).toBe('HC-9')
  })

  it('navega a cancelado si falta el pedido', async () => {
    const confirmar = vi.fn()
    const result = await resolverRespuestaTilopay('?code=1', confirmar)
    expect(confirmar).not.toHaveBeenCalled()
    expect(result.destino).toBe('cancelado')
  })

  it('navega a cancelado si el backend rechaza', async () => {
    const confirmar = vi.fn().mockResolvedValue({ data: { estadoPago: 'FALLIDO', message: 'Rechazado' } })
    const result = await resolverRespuestaTilopay('?code=2&order=HC-8&description=Declined', confirmar)
    expect(result.destino).toBe('cancelado')
    expect(result.motivo).toBe('Declined')
  })
})
