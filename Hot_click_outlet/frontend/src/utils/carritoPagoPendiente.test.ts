import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/paymentService', () => ({
  paymentService: { consultarEstado: vi.fn() },
}))

// Sin DOM en vitest: sessionStorage en memoria.
const memoria = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => memoria.get(k) ?? null,
  setItem: (k: string, v: string) => { memoria.set(k, String(v)) },
  removeItem: (k: string) => { memoria.delete(k) },
  clear: () => memoria.clear(),
})

import { paymentService } from '@/services/paymentService'
import {
  CLAVE_PAGO_PENDIENTE,
  marcarPagoPendiente,
  revisarPagoPendiente,
} from './carritoPagoPendiente'

const consultar = paymentService.consultarEstado as unknown as ReturnType<typeof vi.fn>

describe('QA7-E1 carrito con pago pendiente', () => {
  beforeEach(() => {
    sessionStorage.clear()
    consultar.mockReset()
  })

  it('vacía el carrito si el pago quedó CAPTURADO aunque la página de éxito no cargó', async () => {
    marcarPagoPendiente('ORD-1')
    consultar.mockResolvedValue({ data: { estadoPago: 'CAPTURADO' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(true)
    expect(clear).toHaveBeenCalledOnce()
    expect(consultar).toHaveBeenCalledWith('ORD-1')
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('PENDIENTE no vacía y conserva la marca', async () => {
    marcarPagoPendiente('ORD-2')
    consultar.mockResolvedValue({ data: { estadoPago: 'PENDIENTE' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).not.toBeNull()
  })

  it('CANCELADO no vacía y borra la marca', async () => {
    marcarPagoPendiente('ORD-3')
    consultar.mockResolvedValue({ data: { estadoPago: 'CANCELADO' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('error de red no vacía ni lanza', async () => {
    marcarPagoPendiente('ORD-4')
    consultar.mockRejectedValue(new Error('red'))
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })

  it('marca vencida (más de 24 h) se descarta sin consultar', async () => {
    marcarPagoPendiente('ORD-5', 0)
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear, 25 * 60 * 60 * 1000)).toBe(false)
    expect(consultar).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('sin marca no consulta', async () => {
    expect(await revisarPagoPendiente(vi.fn())).toBe(false)
    expect(consultar).not.toHaveBeenCalled()
  })
})
