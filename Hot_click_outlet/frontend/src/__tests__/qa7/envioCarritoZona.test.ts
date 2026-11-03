import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }))

import { cotizarZonaEnvio } from '@/config/montosEnvio'
import { paquetesDelCarrito, totalEnvioEstimado } from '@/pages/carrito/cartHelpers'
import { envioPorNegocio } from '@/pages/checkout/useCheckoutForm'
import { esDestinoGAMEstricto } from '@/pages/checkout/ubicacionesCR'

/** QA7-D1: Acosta (San José) es fuera del GAM: subtotal ₡5.000 + envío ₡5.500 = ₡10.500, lo que cobra ONVO. */
describe('QA7-D1 | envío del carrito y checkout según la zona del servidor', () => {
  beforeEach(() => get.mockReset())

  it('el carrito no estima ₡4.000 GAM sin destino: el envío queda «varía» y no suma', () => {
    const items = [{ id: 1, nombre: 'Prod', precio: 5000, cantidad: 1, bodegaId: 7, empresaId: 3 }] as unknown as Parameters<typeof paquetesDelCarrito>[0]
    const paquetes = paquetesDelCarrito(items)
    expect(paquetes).toHaveLength(1)
    expect(paquetes[0].envio).toBe(0)
    expect(paquetes[0].envioVaria).toBe(true)
    expect(totalEnvioEstimado(paquetes)).toBe(0)
  })

  it('la zona viene del servidor (/public/envio/cotizar) y Acosta cobra fuera del GAM', async () => {
    get.mockResolvedValueOnce({ data: { data: { zona: 'FUERA_GAM', metodoEnvio: 'ENVIO_NORMAL_FUERA_GAM', montoCrc: 5500 } } })
    await expect(cotizarZonaEnvio('San José', 'Acosta')).resolves.toBe('FUERA_GAM')
    expect(get).toHaveBeenCalledWith('/public/envio/cotizar', { params: { provincia: 'San José', canton: 'Acosta' } })
  })

  it('si el servidor no responde, la regla local es la estricta (igual que el cobro)', async () => {
    get.mockRejectedValueOnce(new Error('red'))
    await expect(cotizarZonaEnvio('San José', 'Acosta')).resolves.toBeNull()
    expect(esDestinoGAMEstricto('San José', 'Acosta')).toBe(false)
    expect(esDestinoGAMEstricto('', '')).toBe(false)
    expect(esDestinoGAMEstricto('San José', 'Escazú')).toBe(true)
  })

  it('total del checkout para Acosta = ₡10.500 (no ₡9.000)', () => {
    const paquetes = [{ bodegaId: '7', items: [{ empresaId: 3 }], subtotal: 5000 }] as unknown as Parameters<typeof envioPorNegocio>[0]
    const metodo = esDestinoGAMEstricto('San José', 'Acosta') ? 'ENVIO_NORMAL_GAM' : 'ENVIO_NORMAL_FUERA_GAM'
    const envio = envioPorNegocio(paquetes, { '7': metodo })
    expect(envio).toBe(5500)
    expect(5000 + envio).toBe(10500)
  })
})
