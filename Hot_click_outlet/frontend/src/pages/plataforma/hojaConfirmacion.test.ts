import { describe, expect, it, vi } from 'vitest'
import { manejadoresFondo } from './HojaConfirmacion'

describe('HojaConfirmacion: fondo', () => {
  it('Escape cierra la hoja', () => {
    const onCancelar = vi.fn()
    const stopPropagation = vi.fn()
    manejadoresFondo(onCancelar).alTeclear({ key: 'Escape', stopPropagation })
    expect(onCancelar).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalled()
  })

  it('otras teclas no cierran', () => {
    const onCancelar = vi.fn()
    manejadoresFondo(onCancelar).alTeclear({ key: 'Enter', stopPropagation: vi.fn() })
    expect(onCancelar).not.toHaveBeenCalled()
  })

  it('clic directo en el fondo cierra; clic dentro del diálogo no', () => {
    const onCancelar = vi.fn()
    const { alClicFondo } = manejadoresFondo(onCancelar)
    const fondo = {} as EventTarget & HTMLDivElement
    alClicFondo({ target: {} as EventTarget, currentTarget: fondo })
    expect(onCancelar).not.toHaveBeenCalled()
    alClicFondo({ target: fondo, currentTarget: fondo })
    expect(onCancelar).toHaveBeenCalledTimes(1)
  })
})
