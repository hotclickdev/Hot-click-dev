import { beforeEach, describe, expect, it, vi } from 'vitest'

// Candado de QA-NEG-056: el POS nunca crea una sesión QR con SINPE ni cobra SINPE fuera de ONVO.
// METODOS_CAJA sin SINPE ya lo cubre checkout/sinpeFueraOnvo.test.ts.
// El repo no usa testing-library; se llama al hook directamente con React mockeado (estado fijo).

const mocks = vi.hoisted(() => ({
  crearQrSesion: vi.fn(),
  crearVenta: vi.fn(),
  getCajaActiva: vi.fn(),
  abrirCaja: vi.fn(),
}))

vi.mock('react', () => ({
  // cartItems es el único estado inicializado con un arreglo: se le da un ítem para pasar el guard.
  useState: (initial: unknown) => [
    Array.isArray(initial) ? [{ id: 1, nombre: 'Producto', cantidad: 1, precio: 1000 }] : initial,
    vi.fn(),
  ],
  useEffect: () => {},
  useCallback: (fn: unknown) => fn,
}))

vi.mock('@/services/posService', () => ({ posService: mocks }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
vi.mock('@/store/authStore', () => ({
  default: (sel: (s: Record<string, unknown>) => unknown) => sel({ userName: 'x', userRole: 'ADMIN' }),
}))
vi.mock('@/store/posStore', () => ({ default: () => ({ bodegaId: 7 }) }))

import { useAdminPOS } from './useAdminPOS'

describe('POS sin SINPE (QA-NEG-056)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.crearQrSesion.mockResolvedValue({ token: 'tok-qr' })
  })

  it('handleQrCliente crea la sesión QR solo con TARJETA', async () => {
    await useAdminPOS().handleQrCliente()

    expect(mocks.crearQrSesion).toHaveBeenCalledTimes(1)
    const body = mocks.crearQrSesion.mock.calls[0][0]
    expect(body.metodosPago).toEqual(['TARJETA'])
    expect(body.metodoPago).toBe('TARJETA')
    expect(JSON.stringify(body)).not.toContain('SINPE')
  })

  it('handleConfirmarPago con SINPE no crea QR ni llama al servicio de pago', async () => {
    await useAdminPOS().handleConfirmarPago({ metodoPago: 'SINPE' } as never)

    expect(mocks.crearQrSesion).not.toHaveBeenCalled()
    expect(mocks.crearVenta).not.toHaveBeenCalled()
  })

  it('handleConfirmarPago con TARJETA sí crea QR, y solo de tarjeta', async () => {
    await useAdminPOS().handleConfirmarPago({ metodoPago: 'TARJETA' } as never)

    expect(mocks.crearQrSesion).toHaveBeenCalledTimes(1)
    expect(mocks.crearQrSesion.mock.calls[0][0].metodosPago).toEqual(['TARJETA'])
  })
})
