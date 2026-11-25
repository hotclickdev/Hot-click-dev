import { describe, expect, it } from 'vitest'
import {
  contarVariables,
  nombrePlantillaValido,
  parametrosIniciales,
  porcentaje,
  puedeLanzar,
  variableAlBorde,
} from './campanaHelpers'

describe('campanaHelpers', () => {
  it('cuenta la variable más alta de la plantilla', () => {
    expect(contarVariables('Hola {{1}}, tu código {{2}} vence hoy')).toBe(2)
    expect(contarVariables('Sin variables')).toBe(0)
  })

  it('detecta una variable al inicio o al final (Meta la rechaza)', () => {
    expect(variableAlBorde('{{1}} te invita')).toBe(true)
    expect(variableAlBorde('Te invita {{1}}')).toBe(true)
    expect(variableAlBorde('Hola {{1}}, mirá esto')).toBe(false)
  })

  it('valida el nombre técnico de la plantilla', () => {
    expect(nombrePlantillaValido('oferta_diciembre')).toBe(true)
    expect(nombrePlantillaValido('Oferta Diciembre')).toBe(false)
    expect(nombrePlantillaValido('ab')).toBe(false)
  })

  it('calcula porcentajes sin dividir entre cero', () => {
    expect(porcentaje(1, 4)).toBe(25)
    expect(porcentaje(3, 0)).toBe(0)
  })

  it('solo se lanza un borrador con plantilla aprobada y contactos', () => {
    expect(puedeLanzar('BORRADOR', 'APROBADA', 3)).toBe(true)
    expect(puedeLanzar('BORRADOR', 'PENDIENTE', 3)).toBe(false)
    expect(puedeLanzar('BORRADOR', 'APROBADA', 0)).toBe(false)
    expect(puedeLanzar('EN_CURSO', 'APROBADA', 3)).toBe(false)
  })

  it('propone el nombre del cliente para la primera variable', () => {
    expect(parametrosIniciales('Hola {{1}}, oferta {{2}}')).toEqual(['{nombre}', ''])
    expect(parametrosIniciales('Sin variables')).toEqual([])
  })
})
