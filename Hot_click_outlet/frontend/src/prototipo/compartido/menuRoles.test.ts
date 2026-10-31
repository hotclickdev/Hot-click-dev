import { describe, expect, it } from 'vitest'
import { verSucursales } from './menuRoles'

describe('MenuPage: MIS SUCURSALES por rol', () => {
  it('se oculta para EDITOR y LECTOR', () => {
    expect(verSucursales('EDITOR')).toBe(false)
    expect(verSucursales('LECTOR')).toBe(false)
  })
  it('se muestra para propietario y admin', () => {
    expect(verSucursales('PROPIETARIO')).toBe(true)
    expect(verSucursales('ADMIN')).toBe(true)
  })
})
