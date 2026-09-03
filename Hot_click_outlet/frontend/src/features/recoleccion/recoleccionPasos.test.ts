import { describe, expect, it } from 'vitest'
import { ZONA_FUERA_GAM, ZONA_GAM } from './zonaLogistica'
import { validarPasoRecoleccion } from './recoleccionPasos'
import type { RecoleccionCreatePayload } from './recoleccionTipos'

const form: RecoleccionCreatePayload = {
  zona: ZONA_GAM,
  direccionRecoleccion: '',
  contactoRecoleccion: '',
  telefonoRecoleccion: '',
  direccionEntrega: '',
  contactoEntrega: '',
  telefonoEntrega: '',
  notas: '',
}

describe('validarPasoRecoleccion', () => {
  it('exige GAM en zona', () => {
    expect(validarPasoRecoleccion(0, { ...form, zona: ZONA_FUERA_GAM })).toMatch(/GAM/)
    expect(validarPasoRecoleccion(0, form)).toBeNull()
  })

  it('exige datos de pickup y entrega', () => {
    expect(validarPasoRecoleccion(1, form)).toMatch(/recolección/)
    expect(
      validarPasoRecoleccion(1, {
        ...form,
        direccionRecoleccion: 'A',
        contactoRecoleccion: 'B',
        telefonoRecoleccion: '8',
      }),
    ).toBeNull()
    expect(validarPasoRecoleccion(2, form)).toMatch(/cliente/)
  })
})
