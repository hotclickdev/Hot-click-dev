import { describe, expect, it } from 'vitest'
import {
  esMiembroVisibleEnLista,
  nombreVisibleMiembro,
  puedeQuitarMiembro,
} from './equipoConfirmacionHelpers'

describe('equipoConfirmacionHelpers', () => {
  it('nombreVisibleMiembro prioriza nombre, luego correo', () => {
    expect(nombreVisibleMiembro({ nombre: ' Ana ', correo: 'a@b.com' })).toBe('Ana')
    expect(nombreVisibleMiembro({ correo: ' a@b.com ' })).toBe('a@b.com')
    expect(nombreVisibleMiembro({})).toBe('Miembro')
  })

  it('puedeQuitarMiembro bloquea al propietario', () => {
    expect(puedeQuitarMiembro({ rolEnEmpresa: 'PROPIETARIO' })).toBe(false)
    expect(puedeQuitarMiembro({ rolEnEmpresa: 'EDITOR' })).toBe(true)
    expect(puedeQuitarMiembro({})).toBe(true)
  })

  it('esMiembroVisibleEnLista solo activos y pendientes', () => {
    expect(esMiembroVisibleEnLista({ estado: 1 })).toBe(true)
    expect(esMiembroVisibleEnLista({ estado: 5 })).toBe(true)
    expect(esMiembroVisibleEnLista({ estado: 2 })).toBe(false)
    expect(esMiembroVisibleEnLista({})).toBe(false)
  })
})
