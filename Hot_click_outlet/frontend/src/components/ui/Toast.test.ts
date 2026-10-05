import { describe, expect, it } from 'vitest'
import { DURACION_TOAST_MS, msCierreToast } from './Toast'

describe('msCierreToast', () => {
  it('un error sin duración queda hasta la X', () => {
    expect(msCierreToast('error', undefined, false)).toBeNull()
  })

  it('un error con duración se oculta a los 5 segundos', () => {
    expect(msCierreToast('error', DURACION_TOAST_MS, false)).toBe(5000)
  })

  it('el resto sigue en 5 segundos y una acción no se cierra sola', () => {
    expect(msCierreToast('info', undefined, false)).toBe(5000)
    expect(msCierreToast('error', 5000, true)).toBeNull()
  })
})
