import { describe, expect, it, vi } from 'vitest'
import { activarNegocio, decidirPanelSinNegocio, negociosDe } from './negociosMembresia'

describe('panel sin negocio activo (QA5 área 2 fila 27)', () => {
  it('lee mis-negocios desde ResponseDTO y descarta entradas sin id', () => {
    expect(negociosDe({ data: [{ id: 1, nombre: 'A' }, { nombre: 'sin id' }] })).toEqual([{ id: 1, nombre: 'A' }])
    expect(negociosDe([{ id: 2 }])).toEqual([{ id: 2 }])
    expect(negociosDe({ data: null })).toEqual([])
  })

  it('con membresías nunca manda a crear negocio: 1 se activa sola, varias muestran selector', () => {
    expect(decidirPanelSinNegocio([])).toBe('sin-negocio')
    expect(decidirPanelSinNegocio([{ id: 1 }])).toBe('auto')
    expect(decidirPanelSinNegocio([{ id: 1 }, { id: 2 }])).toBe('elegir')
  })

  it('activa con cambiar-negocio, guarda la sesión y carga el tenant', async () => {
    const auth = { accessToken: 'jwt', empresaId: 41, rol: 'EMPRENDEDOR' }
    const cambiarNegocio = vi.fn().mockResolvedValue({ data: { success: true, data: auth } })
    const login = vi.fn()
    const cargarTenant = vi.fn().mockResolvedValue(undefined)
    await activarNegocio(41, { cambiarNegocio, login, cargarTenant })
    expect(cambiarNegocio).toHaveBeenCalledWith(41)
    expect(login).toHaveBeenCalledWith(auth)
    expect(cargarTenant).toHaveBeenCalledTimes(1)
  })
})
