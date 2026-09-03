import { describe, expect, it } from 'vitest'
import {
  PASOS_RENOMBRAR_SUCURSAL,
  PASOS_SUCURSAL,
  validarPasoRenombrarSucursal,
  validarPasoSucursal,
} from './sucursalPasos'

describe('sucursalPasos', () => {
  it('tiene nombre → ubicación → confirmar', () => {
    expect(PASOS_SUCURSAL.map((p) => p.id)).toEqual(['nombre', 'ubicacion', 'confirmar'])
  })

  it('exige nombre en el primer paso', () => {
    expect(validarPasoSucursal(0, { nombre: '  ', ubicacion: '' })).toBe(
      'Escribí el nombre de la sucursal',
    )
    expect(validarPasoSucursal(0, { nombre: 'Centro', ubicacion: '' })).toBeNull()
  })

  it('exige ubicación en el segundo paso', () => {
    expect(validarPasoSucursal(1, { nombre: 'Centro', ubicacion: '' })).toBe(
      'Escribí la ubicación o dirección',
    )
    expect(
      validarPasoSucursal(1, { nombre: 'Centro', ubicacion: 'San José, Av. 2' }),
    ).toBeNull()
  })

  it('confirmar no valida campos', () => {
    expect(validarPasoSucursal(2, { nombre: 'Centro', ubicacion: 'X' })).toBeNull()
  })

  it('renombrar es nombre → confirmar', () => {
    expect(PASOS_RENOMBRAR_SUCURSAL.map((p) => p.id)).toEqual(['nombre', 'confirmar'])
  })

  it('renombrar exige nombre', () => {
    expect(validarPasoRenombrarSucursal(0, '  ')).toBe('Escribí el nombre de la sucursal')
    expect(validarPasoRenombrarSucursal(0, 'Heredia')).toBeNull()
    expect(validarPasoRenombrarSucursal(1, 'Heredia')).toBeNull()
  })
})
