import { beforeEach, describe, expect, it, vi } from 'vitest'

// SINPE solo dentro de la pasarela: handleQrConfirmSinpe solo reacciona a la confirmación
// automática (autoConfirmed=true). El repo no usa testing-library ni renderHook: se llama al
// hook directamente con React mockeado (useState con setters espía, useEffect sin efecto).

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  setters: [] as Array<ReturnType<typeof vi.fn>>,
  posService: {
    crearQrSesion: vi.fn(),
    crearVenta: vi.fn(),
    getCajaActiva: vi.fn(),
    abrirCaja: vi.fn(),
    cancelarQrSesion: vi.fn(),
  },
}))

vi.mock('react', () => ({
  // Orden de useState en el hook: step, turno, saving, cartItems, descuento, cliente,
  // receipt, qrData, loadingVenta, reportePendiente.
  useState: (initial: unknown) => {
    const idx = mocks.setters.length
    const setter = vi.fn()
    mocks.setters.push(setter)
    const valores: Record<number, unknown> = {
      3: [{ id: 1, nombre: 'Producto', cantidad: 2, precio: 1000 }],
      4: 500,
      7: { token: 'tok-qr', total: 1500, metodoPago: 'TARJETA' },
    }
    return [idx in valores ? valores[idx] : initial, setter]
  },
  useEffect: () => {},
  useCallback: (fn: unknown) => fn,
}))

vi.mock('@/services/posService', () => ({ posService: mocks.posService }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: mocks.showToast }) }))
vi.mock('@/store/authStore', () => ({
  default: (sel: (s: Record<string, unknown>) => unknown) => sel({ userName: 'x', userRole: 'ADMIN' }),
}))
vi.mock('@/store/posStore', () => ({ default: () => ({ bodegaId: 7 }) }))

import { useAdminPOS } from './useAdminPOS'

const IDX = { step: 0, cartItems: 3, descuento: 4, receipt: 6, qrData: 7 }

describe('handleQrConfirmSinpe: solo confirmación automática de la pasarela', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setters.length = 0
  })

  it('autoConfirmed=true deja el recibo, vacía carrito, descuento 0, paso recibo y toast de éxito', async () => {
    await useAdminPOS().handleQrConfirmSinpe('tok-qr', true, 'PED-1', 'TARJETA')

    expect(mocks.setters[IDX.receipt]).toHaveBeenCalledTimes(1)
    const recibo = mocks.setters[IDX.receipt].mock.calls[0][0]
    expect(recibo.numeroPedido).toBe('PED-1')
    expect(recibo.metodoPago).toBe('TARJETA')
    expect(recibo.totalPedido).toBe(1500)
    expect(recibo.items).toHaveLength(1)
    expect(mocks.setters[IDX.cartItems]).toHaveBeenCalledWith([])
    expect(mocks.setters[IDX.descuento]).toHaveBeenCalledWith(0)
    expect(mocks.setters[IDX.qrData]).toHaveBeenCalledWith(null)
    expect(mocks.setters[IDX.step]).toHaveBeenCalledWith('recibo')
    expect(mocks.showToast).toHaveBeenCalledTimes(1)
    expect(mocks.showToast).toHaveBeenCalledWith('Pago con tarjeta confirmado', 'success')
  })

  it('autoConfirmed=true con SINPE final muestra el toast de SINPE confirmado', async () => {
    await useAdminPOS().handleQrConfirmSinpe('tok-qr', true, 'PED-2', 'SINPE')

    expect(mocks.showToast).toHaveBeenCalledWith('SINPE confirmado', 'success')
  })

  it('autoConfirmed=false no cambia estado, no llama servicios y no muestra toast', async () => {
    await useAdminPOS().handleQrConfirmSinpe('tok-qr', false, 'PED-3')

    for (const setter of mocks.setters) expect(setter).not.toHaveBeenCalled()
    for (const fn of Object.values(mocks.posService)) expect(fn).not.toHaveBeenCalled()
    expect(mocks.showToast).not.toHaveBeenCalled()
  })
})
