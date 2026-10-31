import { describe, expect, it } from 'vitest'
import { validarPasoInvitarEquipo } from './equipoPasos'
import type { FormularioEquipo } from '@/pages/admin/equipo/equipoHelpers'

// B1: la contraseña temporal de un miembro nuevo exige 8 caracteres (igual que el backend).
describe('validarPasoInvitarEquipo — clave mínima', () => {
  const form = (password: string) =>
    ({ nombre: 'Ana', correo: 'ana@example.com', password } as unknown as FormularioEquipo)

  it('rechaza 7 caracteres', () => {
    expect(validarPasoInvitarEquipo(1, form('Abcdef1'))).toMatch(/8 caracteres/)
  })
  it('rechaza sin mayúscula o sin número (misma política que el registro)', () => {
    expect(validarPasoInvitarEquipo(1, form('abcdefg1'))).toMatch(/mayúscula/)
    expect(validarPasoInvitarEquipo(1, form('Abcdefgh'))).toMatch(/número/)
  })
  it('acepta 8 caracteres', () => {
    expect(validarPasoInvitarEquipo(1, form('Abcdefg1'))).toBeNull()
  })
})

describe('validarPasoInvitarEquipo — rol CAJERO', () => {
  const form = (rolEnEmpresa: string) =>
    ({ nombre: 'Ana', correo: 'ana@example.com', password: 'Abcdefg1', rolEnEmpresa } as unknown as FormularioEquipo)

  it('acepta CAJERO como rol asignable', () => {
    expect(validarPasoInvitarEquipo(2, form('CAJERO'))).toBeNull()
  })
  it('rechaza un rol fuera de la lista', () => {
    expect(validarPasoInvitarEquipo(2, form('GERENTE'))).toBe('Elegí un rol.')
  })
})
