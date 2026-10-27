import { describe, expect, it } from 'vitest'
import { motivoValido, panelDe, tonoDias } from './impagoAdmin'

describe('impagoAdmin', () => {
  it('panelDe tolera respuestas vacías o malformadas', () => {
    expect(panelDe(null)).toEqual({ diasGracia: 0, diasExtension: 0, enGracia: [], suspendidas: [] })
    expect(panelDe({ data: { enGracia: 'x', diasExtension: 3 } }).enGracia).toEqual([])
    expect(panelDe({ data: { diasExtension: 3 } }).diasExtension).toBe(3)
  })
  it('motivo obligatorio', () => {
    expect(motivoValido('  ')).toBe(false)
    expect(motivoValido('ok')).toBe(false)
    expect(motivoValido('no pagó')).toBe(true)
  })
  it('tono por días restantes', () => {
    expect(tonoDias(1)).toBe('alerta')
    expect(tonoDias(3)).toBe('azul')
    expect(tonoDias(6)).toBe('neutro')
  })
})
