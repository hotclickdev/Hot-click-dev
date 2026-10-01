import { describe, expect, it } from 'vitest'
import { claveGarantia, descripcionGarantia, fechaConMes, fechaDiaMes, normalizarTelefono, textoVigencia } from './serviciosHelpers'

describe('teléfono de contacto', () => {
  it('agrega +506 al número local de ocho dígitos', () => {
    expect(normalizarTelefono('8888 8888')).toBe('+50688888888')
    expect(normalizarTelefono('8888-8888')).toBe('+50688888888')
  })

  it('conserva el país de quien escribe el prefijo', () => {
    expect(normalizarTelefono('+1 305 555 0100')).toBe('+13055550100')
    expect(normalizarTelefono('+506 8888 8888')).toBe('+50688888888')
  })

  it('no duplica el 506 cuando ya viene sin el signo más', () => {
    expect(normalizarTelefono('506 8888 8888')).toBe('+50688888888')
  })
})

describe('garantía', () => {
  it('el motivo viaja como prefijo de la descripción', () => {
    expect(descripcionGarantia('Se dañó', '  No suena  ')).toBe('[Motivo: Se dañó] No suena')
    expect(descripcionGarantia(null, ' No suena ')).toBe('No suena')
  })

  it('la clave junta producto y pedido', () => {
    expect(claveGarantia({ productoId: 1, pedidoId: 1048 })).toBe('1-1048')
  })

  it('la vigencia usa singular y plural', () => {
    expect(textoVigencia({ diasRestantes: 1, fechaVencimiento: '2026-10-22' })).toBe('1 día restante · vence 22 oct')
    expect(textoVigencia({ diasRestantes: 28 })).toBe('28 días restantes')
  })
})

describe('fechas', () => {
  it('día y mes corto, sin año', () => {
    expect(fechaDiaMes('2026-08-30')).toBe('30 ago')
    expect(fechaDiaMes(undefined)).toBe('')
  })

  it('con año y sin desfase por zona horaria', () => {
    expect(fechaConMes('2026-09-25')).toBe('25 sep 2026')
    expect(fechaConMes('2026-10-10T00:00:00')).toBe('10 oct 2026')
  })

  it('un formato desconocido se muestra tal como llega', () => {
    expect(fechaConMes('25/09/2026')).toBe('25/09/2026')
    expect(fechaConMes(null)).toBe('')
  })
})
