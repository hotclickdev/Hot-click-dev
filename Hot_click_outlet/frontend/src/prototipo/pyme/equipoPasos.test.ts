import { describe, expect, it } from 'vitest'
import { validarPasoInvitarEquipo } from './equipoPasos'
import type { FormularioEquipo } from '@/pages/admin/equipo/equipoHelpers'

// Riesgo 15-nov: quien invita ya no define la contraseña; el paso de contacto solo valida el correo.
describe('validarPasoInvitarEquipo — contacto sin contraseña', () => {
  const form = (correo: string) =>
    ({ nombre: 'Ana', correo } as unknown as FormularioEquipo)

  it('acepta un correo válido sin contraseña', () => {
    expect(validarPasoInvitarEquipo(1, form('ana@example.com'))).toBeNull()
  })
  it('rechaza un correo inválido', () => {
    expect(validarPasoInvitarEquipo(1, form('no-es-correo'))).toBe('Correo inválido.')
  })
})

describe('validarPasoInvitarEquipo — rol CAJERO', () => {
  const form = (rolEnEmpresa: string) =>
    ({ nombre: 'Ana', correo: 'ana@example.com', rolEnEmpresa } as unknown as FormularioEquipo)

  it('acepta CAJERO como rol asignable', () => {
    expect(validarPasoInvitarEquipo(2, form('CAJERO'))).toBeNull()
  })
  it('rechaza un rol fuera de la lista', () => {
    expect(validarPasoInvitarEquipo(2, form('GERENTE'))).toBe('Elegí un rol.')
  })
})
