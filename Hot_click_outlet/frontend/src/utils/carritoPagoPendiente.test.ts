import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/paymentService', () => ({
  paymentService: { consultarEstado: vi.fn() },
}))

// Sin DOM en vitest: localStorage (compartido entre pestañas) y sessionStorage (por pestaña) en memoria.
function almacen() {
  const memoria = new Map<string, string>()
  return {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => { memoria.set(k, String(v)) },
    removeItem: (k: string) => { memoria.delete(k) },
    clear: () => memoria.clear(),
  }
}
vi.stubGlobal('localStorage', almacen())
vi.stubGlobal('sessionStorage', almacen())

import { paymentService } from '@/services/paymentService'
import {
  CLAVE_PAGO_PENDIENTE,
  CLAVE_CARRITO,
  escucharCarritoEntrePestanas,
  marcarPagoPendiente,
  revisarPagoPendiente,
} from './carritoPagoPendiente'

const consultar = paymentService.consultarEstado as unknown as ReturnType<typeof vi.fn>

describe('QA7-E1 carrito con pago pendiente', () => {
  beforeEach(() => {
    localStorage.clear()
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
    expect(localStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('PENDIENTE no vacía y conserva la marca', async () => {
    marcarPagoPendiente('ORD-2')
    consultar.mockResolvedValue({ data: { estadoPago: 'PENDIENTE' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(localStorage.getItem(CLAVE_PAGO_PENDIENTE)).not.toBeNull()
  })

  it('CANCELADO no vacía y borra la marca', async () => {
    marcarPagoPendiente('ORD-3')
    consultar.mockResolvedValue({ data: { estadoPago: 'CANCELADO' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(false)
    expect(clear).not.toHaveBeenCalled()
    expect(localStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
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
    expect(localStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('sin marca no consulta', async () => {
    expect(await revisarPagoPendiente(vi.fn())).toBe(false)
    expect(consultar).not.toHaveBeenCalled()
  })

  it('BAJO: la marca se comparte entre pestañas (localStorage): otra pestaña de retorno vacía el carrito', async () => {
    marcarPagoPendiente('ORD-TAB')
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
    // otra pestaña: sessionStorage propio vacío, mismo localStorage
    sessionStorage.clear()
    consultar.mockResolvedValue({ data: { estadoPago: 'CAPTURADO' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(true)
    expect(clear).toHaveBeenCalledOnce()
  })

  it('BAJO: lee y borra la marca vieja guardada por pestaña', async () => {
    sessionStorage.setItem(CLAVE_PAGO_PENDIENTE, JSON.stringify({ numeroPedido: 'ORD-OLD', desde: Date.now() }))
    consultar.mockResolvedValue({ data: { estadoPago: 'CAPTURADO' } })
    const clear = vi.fn()
    expect(await revisarPagoPendiente(clear)).toBe(true)
    expect(sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)).toBeNull()
  })

  it('BAJO: las otras pestañas releen el carrito cuando cambia en otra pestaña', () => {
    const oyentes = new Map<string, (e: Event) => void>()
    const objetivo = {
      addEventListener: (t: string, f: (e: Event) => void) => { oyentes.set(t, f) },
      removeEventListener: (t: string) => { oyentes.delete(t) },
    } as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>
    const releer = vi.fn()
    const dejar = escucharCarritoEntrePestanas(releer, objetivo)
    oyentes.get('storage')!({ key: 'otra-clave' } as unknown as Event)
    expect(releer).not.toHaveBeenCalled()
    oyentes.get('storage')!({ key: CLAVE_CARRITO } as unknown as Event)
    expect(releer).toHaveBeenCalledOnce()
    dejar()
    expect(oyentes.has('storage')).toBe(false)
  })
})
