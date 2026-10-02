import { describe, expect, it } from 'vitest'
import {
  DIAS_DESCARTE, ESTADO_INICIAL, debeMostrarTarjeta, descartarTarjeta, parsearEstado, registrarVisita,
} from './tarjetaInstalarHelpers'

const AHORA = 1_700_000_000_000
const DIA = 86_400_000
const base = { ahora: AHORA, puedeInstalar: true, instalada: false, esPrimeraPagina: false }

describe('debeMostrarTarjeta', () => {
  it('se muestra desde la segunda visita si el navegador ofrece instalar', () => {
    expect(debeMostrarTarjeta({ ...base, estado: { visitas: 2, descartadaHasta: null } })).toBe(true)
  })

  it('no se muestra en la primera visita', () => {
    expect(debeMostrarTarjeta({ ...base, estado: { visitas: 1, descartadaHasta: null } })).toBe(false)
  })

  it('nunca en la primera página de la sesión', () => {
    expect(debeMostrarTarjeta({ ...base, esPrimeraPagina: true, estado: { visitas: 5, descartadaHasta: null } })).toBe(false)
  })

  it('no aparece si el navegador no ofrece la instalación o ya está instalada', () => {
    const estado = { visitas: 3, descartadaHasta: null }
    expect(debeMostrarTarjeta({ ...base, puedeInstalar: false, estado })).toBe(false)
    expect(debeMostrarTarjeta({ ...base, instalada: true, estado })).toBe(false)
  })

  it('"Ahora no" la oculta por 30 días', () => {
    const estado = descartarTarjeta({ visitas: 3, descartadaHasta: null }, AHORA)
    expect(debeMostrarTarjeta({ ...base, ahora: AHORA + (DIAS_DESCARTE - 1) * DIA, estado })).toBe(false)
    expect(debeMostrarTarjeta({ ...base, ahora: AHORA + DIAS_DESCARTE * DIA, estado })).toBe(true)
  })
})

describe('parsearEstado', () => {
  it('tolera vacío, JSON roto y valores inválidos', () => {
    expect(parsearEstado(null)).toEqual(ESTADO_INICIAL)
    expect(parsearEstado('{roto')).toEqual(ESTADO_INICIAL)
    expect(parsearEstado('{"visitas":"x","descartadaHasta":"y"}')).toEqual(ESTADO_INICIAL)
  })

  it('lee un estado guardado', () => {
    expect(parsearEstado('{"visitas":3,"descartadaHasta":42}')).toEqual({ visitas: 3, descartadaHasta: 42 })
  })
})

describe('registrarVisita', () => {
  it('suma una visita sin tocar el descarte', () => {
    expect(registrarVisita({ visitas: 1, descartadaHasta: 9 })).toEqual({ visitas: 2, descartadaHasta: 9 })
  })
})
