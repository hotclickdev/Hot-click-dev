import { describe, expect, it } from 'vitest'
import { aFecha, fechaCorta, partesFecha, sumarDiasHabiles, ventanaEntrega } from './fechasPedido'

describe('aFecha', () => {
  it('lee un LocalDate en hora local, sin correrse un día', () => {
    const fecha = aFecha('2026-09-26')
    expect(fecha?.getFullYear()).toBe(2026)
    expect(fecha?.getMonth()).toBe(8)
    expect(fecha?.getDate()).toBe(26)
  })

  it('acepta fecha con hora', () => {
    expect(aFecha('2026-09-24T10:30:00')?.getDate()).toBe(24)
  })

  it('devuelve null si no hay fecha o no se puede leer', () => {
    expect(aFecha(null)).toBeNull()
    expect(aFecha(undefined)).toBeNull()
    expect(aFecha('no es fecha')).toBeNull()
  })
})

describe('fechaCorta', () => {
  it('usa la abreviatura «set.» de Costa Rica', () => {
    expect(fechaCorta('2026-09-24', 'es')).toBe('24 set. 2026')
  })

  it('queda vacía sin fecha', () => {
    expect(fechaCorta(undefined, 'es')).toBe('')
  })
})

describe('partesFecha', () => {
  it('usa Intl para idiomas que no son español', () => {
    const partes = partesFecha(new Date(2026, 8, 24), 'en')
    expect(partes).toEqual({ dia: 24, mes: 'Sep', anio: 2026 })
  })
})

describe('sumarDiasHabiles', () => {
  it('salta el fin de semana', () => {
    const viernes = new Date(2026, 8, 25)
    expect(sumarDiasHabiles(viernes, 1).getDate()).toBe(28)
  })

  it('no modifica la fecha original', () => {
    const lunes = new Date(2026, 8, 21)
    sumarDiasHabiles(lunes, 3)
    expect(lunes.getDate()).toBe(21)
  })
})

describe('ventanaEntrega', () => {
  it('llega entre 2 y 4 días hábiles después de salir', () => {
    const { desde, hasta } = ventanaEntrega(new Date(2026, 8, 21))
    expect(desde.getDate()).toBe(23)
    expect(hasta.getDate()).toBe(25)
  })
})
