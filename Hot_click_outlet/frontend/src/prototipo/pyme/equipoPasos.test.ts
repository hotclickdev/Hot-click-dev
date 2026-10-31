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
  it('acepta 8 caracteres', () => {
    expect(validarPasoInvitarEquipo(1, form('Abcdefg1'))).toBeNull()
  })
})
