import { describe, expect, it } from 'vitest'
import { indiceHistorial, inicialesDe, puedeAvanzar, puedeVolverAtras } from './headerHelpers'

describe('inicialesDe', () => {
  it('toma la primera letra del primer y del último nombre', () => {
    expect(inicialesDe('María Rojas')).toBe('MR')
    expect(inicialesDe('  ana  lucía   solís ')).toBe('AS')
  })

  it('con una sola palabra usa sus dos primeras letras', () => {
    expect(inicialesDe('andrea')).toBe('AN')
    expect(inicialesDe('A')).toBe('A')
  })

  it('devuelve vacío si no hay nombre', () => {
    expect(inicialesDe(null)).toBe('')
    expect(inicialesDe(undefined)).toBe('')
    expect(inicialesDe('   ')).toBe('')
  })
})

describe('puedeVolverAtras', () => {
  it('es verdadero solo si React Router registra una entrada previa', () => {
    expect(puedeVolverAtras({ idx: 2 })).toBe(true)
    expect(puedeVolverAtras({ idx: 0 })).toBe(false)
    expect(puedeVolverAtras(null)).toBe(false)
    expect(puedeVolverAtras({})).toBe(false)
  })
})

describe('indiceHistorial', () => {
  it('lee el idx numérico y descarta el resto', () => {
    expect(indiceHistorial({ idx: 3 })).toBe(3)
    expect(indiceHistorial({ idx: '2' })).toBeNull()
    expect(indiceHistorial(null)).toBeNull()
  })
})

describe('puedeAvanzar', () => {
  it('es verdadero cuando el índice actual quedó detrás del máximo de la visita', () => {
    expect(puedeAvanzar(1, 3)).toBe(true)
    expect(puedeAvanzar(3, 3)).toBe(false)
    expect(puedeAvanzar(null, 3)).toBe(false)
  })
})
