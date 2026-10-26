import { describe, expect, it } from 'vitest'
import { datosSinpeOnvo, tipoSinpeInicial } from './sinpeOnvo'

describe('sinpeOnvo', () => {
  it('cuenta empresa arranca con tipo 3, el resto con 0', () => {
    expect(tipoSinpeInicial(true)).toBe(3)
    expect(tipoSinpeInicial(false)).toBe(0)
  })
  it('datosSinpeOnvo arma el body o devuelve null (fail-closed)', () => {
    expect(datosSinpeOnvo(' 01-0000-0000 ', 0, '8000-0000')).toEqual({
      identificacion: '01-0000-0000', tipoIdentificacion: 0, telefono: '+50680000000',
    })
    expect(datosSinpeOnvo('01-0000-0000', 0, '')).toBeNull()
    expect(datosSinpeOnvo('01-0000-0000', 1, '80000000')).toBeNull()
  })
})
