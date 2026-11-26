import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }))

import { cargarPlanesCompartido, reiniciarCachePlanes } from './useMensualidadesPlanes'

describe('/planes se pide una sola vez por carga', () => {
  beforeEach(() => { reiniciarCachePlanes(); get.mockReset() })
  it('dos consumidores comparten la misma llamada', async () => {
    get.mockResolvedValue({ data: [{ nombre: 'PYME', diasPrueba: 30 }] })
    const [a, b] = await Promise.all([cargarPlanesCompartido(), cargarPlanesCompartido()])
    expect(get).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })
  it('un error no queda guardado: se reintenta', async () => {
    get.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ data: [] })
    expect(await cargarPlanesCompartido()).toBeNull()
    expect(await cargarPlanesCompartido()).toEqual([])
    expect(get).toHaveBeenCalledTimes(2)
  })
})
