import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/sentryClient', () => ({ syncSentryUser: vi.fn() }))
vi.mock('@/utils/analytics', () => ({ identifyUser: vi.fn(), resetAnalyticsUser: vi.fn() }))
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { get, post } }))

import useAuthStore from '@/store/authStore'
import { estadoTiendaApi, olvidarEstadoTienda } from './estadoTiendaApi'

const respuesta = (estado: 'ACTIVA' | 'PAUSADA') => ({ data: { estado, plan: 'Pyme', pedidosEnCurso: 0 } })

describe('caché del estado de pausa', () => {
  beforeEach(() => {
    olvidarEstadoTienda()
    get.mockReset(); post.mockReset()
    useAuthStore.setState({ token: 'tok-a', userId: 1, empresaId: 10 })
  })

  it('se olvida al cerrar sesión: la cuenta siguiente no ve el estado anterior', async () => {
    get.mockResolvedValueOnce(respuesta('PAUSADA')).mockResolvedValueOnce(respuesta('ACTIVA'))
    expect((await estadoTiendaApi.obtener()).estado).toBe('PAUSADA')
    useAuthStore.getState().logout()
    useAuthStore.setState({ token: 'tok-b', userId: 2, empresaId: 20 })
    expect((await estadoTiendaApi.obtener()).estado).toBe('ACTIVA')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('renovar el token de la misma sesión no vuelve a consultar', async () => {
    get.mockResolvedValue(respuesta('PAUSADA'))
    await estadoTiendaApi.obtener()
    useAuthStore.getState().updateAccessToken('tok-a2')
    await estadoTiendaApi.obtener()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('se olvida después de iniciar con éxito el pago de la mensualidad', async () => {
    get.mockResolvedValueOnce(respuesta('PAUSADA')).mockResolvedValueOnce(respuesta('ACTIVA'))
    post.mockResolvedValueOnce({ data: { url: 'https://checkout.onvopay.com/x' } })
    await estadoTiendaApi.obtener()
    expect(await estadoTiendaApi.pagarMensualidad()).toBe('https://checkout.onvopay.com/x')
    expect((await estadoTiendaApi.obtener()).estado).toBe('ACTIVA')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('si el pago no devuelve URL, conserva el estado en caché', async () => {
    get.mockResolvedValue(respuesta('PAUSADA'))
    post.mockResolvedValueOnce({ data: {} })
    await estadoTiendaApi.obtener()
    expect(await estadoTiendaApi.pagarMensualidad()).toBeNull()
    await estadoTiendaApi.obtener()
    expect(get).toHaveBeenCalledTimes(1)
  })
})
