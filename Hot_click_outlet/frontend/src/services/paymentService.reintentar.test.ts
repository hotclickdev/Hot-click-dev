import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
vi.mock('./api', () => ({ default: { post: (...a: unknown[]) => post(...a) } }))

import { limpiarTokensInvitado, paymentService, reintentoTokenGuardado } from './paymentService'

const TOKEN = 'ficticio'
const LEGADO = 'tok-cancel-legado-1'

const memoria = new Map<string, string>()
const fakeStorage = {
  getItem: vi.fn((k: string) => memoria.get(k) ?? null),
  setItem: (k: string, v: string) => void memoria.set(k, v),
  removeItem: vi.fn((k: string) => void memoria.delete(k)),
  clear: () => memoria.clear(),
}
vi.stubGlobal('sessionStorage', fakeStorage)

describe('reintentarTilopay', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: {} })
    sessionStorage.clear()
  })

  it('manda el reintentoToken en el body cuando existe', async () => {
    await paymentService.reintentarTilopay('ORD 1', TOKEN)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/payments/tilopay/reintentar/ORD%201', { reintentoToken: TOKEN })
  })

  it('omite el body cuando no hay token', async () => {
    await paymentService.reintentarTilopay('ORD-1', null)
    await paymentService.reintentarTilopay('ORD-1', '')
    await paymentService.reintentarTilopay('ORD-1')
    for (const call of post.mock.calls) {
      expect(call).toEqual(['/payments/tilopay/reintentar/ORD-1'])
    }
  })

  it('no filtra el token en la URL ni en logs', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    )
    await paymentService.reintentarTilopay('ORD-1', TOKEN)
    expect(String(post.mock.calls[0][0])).not.toContain(TOKEN)
    for (const s of spies) {
      expect(JSON.stringify(s.mock.calls)).not.toContain(TOKEN)
      s.mockRestore()
    }
  })
})

describe('reintentoTokenGuardado', () => {
  beforeEach(() => sessionStorage.clear())

  it('lee el token de reintento del pedido que guardó el checkout', () => {
    sessionStorage.setItem('hc-reintento-token:ORD-1', TOKEN)
    sessionStorage.setItem('hc-cancel-token:ORD-1', LEGADO)
    expect(reintentoTokenGuardado('ORD-1')).toBe(TOKEN)
    expect(reintentoTokenGuardado('ORD-2')).toBeNull()
  })

  it('cae al cancelToken legado si no hay token de reintento', () => {
    sessionStorage.setItem('hc-cancel-token:ORD-1', LEGADO)
    expect(reintentoTokenGuardado('ORD-1')).toBe(LEGADO)
  })

  it('devuelve null si sessionStorage falla', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(reintentoTokenGuardado('ORD-1')).toBeNull()
    fakeStorage.getItem.mockImplementation((k: string) => memoria.get(k) ?? null)
  })
})

describe('limpiarTokensInvitado', () => {
  beforeEach(() => sessionStorage.clear())

  it('borra reintento y cancel token del pedido confirmado y deja los de otros pedidos', () => {
    sessionStorage.setItem('hc-reintento-token:ORD-1', TOKEN)
    sessionStorage.setItem('hc-cancel-token:ORD-1', LEGADO)
    sessionStorage.setItem('hc-reintento-token:ORD-2', TOKEN)
    limpiarTokensInvitado('ORD-1')
    expect(memoria.has('hc-reintento-token:ORD-1')).toBe(false)
    expect(memoria.has('hc-cancel-token:ORD-1')).toBe(false)
    expect(memoria.get('hc-reintento-token:ORD-2')).toBe(TOKEN)
  })

  it('no lanza si sessionStorage falla', () => {
    fakeStorage.removeItem.mockImplementationOnce(() => {
      throw new Error('bloqueado')
    })
    expect(() => limpiarTokensInvitado('ORD-1')).not.toThrow()
  })
})
