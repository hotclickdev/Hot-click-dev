import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => {
  // defaults.baseURL: posService.ts hace axios.create({ baseURL: api.defaults.baseURL }) al importarse.
  const api = { get, defaults: { baseURL: '' } }
  return { default: api, api }
})

describe('/pago/exito sin sesión', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: {} })
    const mem = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
    })
  })

  it('consultarEstado manda el token de estado de la query (?st=) como X-Pedido-Token', async () => {
    const { paymentService } = await import('@/services/paymentService')
    sessionStorage.setItem('hc-cancel-token:HC-1', 'cancel-tok')
    await paymentService.consultarEstado('HC-1', '123.firma')
    expect(get).toHaveBeenCalledWith('/payments/status/HC-1', { headers: { 'X-Pedido-Token': '123.firma' } })
  })

  it('sin token de query usa el cancelToken guardado; sin ninguno no manda header', async () => {
    const { paymentService } = await import('@/services/paymentService')
    sessionStorage.setItem('hc-cancel-token:HC-1', 'cancel-tok')
    await paymentService.consultarEstado('HC-1')
    expect(get).toHaveBeenLastCalledWith('/payments/status/HC-1', { headers: { 'X-Pedido-Token': 'cancel-tok' } })
    await paymentService.consultarEstado('HC-2')
    expect(get).toHaveBeenLastCalledWith('/payments/status/HC-2', undefined)
  })

  it('un 404 del status se reconoce para cortar el polling y pedir inicio de sesión', async () => {
    const { esNoEncontrado, MENSAJE_LOGIN_PEDIDO } = await import('@/hooks/usePayment')
    expect(MENSAJE_LOGIN_PEDIDO).toBe('Iniciá sesión para ver tu pedido')
    expect(esNoEncontrado({ response: { status: 404 } })).toBe(true)
    expect(esNoEncontrado({ response: { status: 500 } })).toBe(false)
    expect(esNoEncontrado(new Error('Network Error'))).toBe(false)
    expect(esNoEncontrado(null)).toBe(false)
  })
})
