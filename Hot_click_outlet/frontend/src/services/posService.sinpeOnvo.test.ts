import { describe, expect, it, vi } from 'vitest'

const post = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: { destino: 'd', monto: 1 } })))
vi.mock('./api', () => ({ default: { defaults: { baseURL: '' }, post: vi.fn(), get: vi.fn(), delete: vi.fn() } }))
vi.mock('axios', () => ({ default: { create: () => ({ post, get: vi.fn() }) } }))

import { posService } from './posService'

describe('posService.iniciarSinpeOnvoQr', () => {
  it('manda identificación, tipo y teléfono del pagador', async () => {
    await posService.iniciarSinpeOnvoQr('tok', '01-0000-0000', 0, '+50680000000')
    expect(post).toHaveBeenCalledWith('/pos/qr/pago/tok/sinpe-onvo', {
      identificacion: '01-0000-0000', tipoIdentificacion: 0, telefono: '+50680000000',
    })
  })
})
