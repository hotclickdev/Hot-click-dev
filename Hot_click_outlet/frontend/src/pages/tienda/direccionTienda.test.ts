import { describe, expect, it } from 'vitest'
import { componerDireccion } from './direccionTienda'

describe('componerDireccion (QA-114-3)', () => {
  it('une distrito, cantón, provincia y señas', () => {
    expect(componerDireccion({ provincia: 'Alajuela', canton: 'San Carlos', distrito: 'Quesada', senas: '200 m norte' }))
      .toBe('Quesada, San Carlos, Alajuela. 200 m norte')
  })
  it('vacío si falta cantón o señas', () => {
    expect(componerDireccion({ provincia: 'Alajuela', canton: '', distrito: '', senas: 'x' })).toBe('')
    expect(componerDireccion({ provincia: 'Alajuela', canton: 'San Carlos', distrito: '', senas: ' ' })).toBe('')
  })
})
