import { describe, expect, it } from 'vitest'
import { montoCobroVisible, montoPlanVisible, rotuloPrecioLista, textoPrecioCatalogo } from './montoPlan'
import { textoMonedaPlanes } from '@/config/planesPrecios'

describe('monto del cobro antes de confirmar', () => {
  it('muestra el USD que el backend mando en el cobro', () => {
    expect(montoCobroVisible({ montoUsd: 24, moneda: 'USD' })).toBe('US$24/mes')
    expect(montoCobroVisible({ montoUsd: 12900, moneda: 'CRC' })).toBe('₡12.900/mes')
    expect(montoCobroVisible({ montoUsd: 24 })).toBeNull()
  })

  it('el catalogo tambien usa precioUsd y no los colones', () => {
    expect(montoPlanVisible({ precioUsd: 24, moneda: 'USD' })).toBe('US$24/mes')
    expect(montoPlanVisible({ precioUsd: 12900, moneda: 'CRC' })).toBe('₡12.900/mes')
    expect(montoPlanVisible({ precioUsd: 24, moneda: 'EUR' })).toBeNull()
    expect(montoPlanVisible({ precioUsd: 0 })).toBeNull()
  })

  it('sin monto no inventa una cifra', () => {
    expect(montoCobroVisible(null)).toBeNull()
    expect(montoCobroVisible({})).toBeNull()
    expect(montoCobroVisible({ montoUsd: 0 })).toBeNull()
    expect(montoPlanVisible(null)).toBeNull()
  })
})

describe('tarjetas de Admin › Planes y /planes: mensualidad en USD desde precioUsd', () => {
  it('usa precioUsd del backend (9/24/49) y nunca los colones de precioMensual', () => {
    expect(textoPrecioCatalogo({ precioUsd: 9, moneda: 'USD', precioMensual: 0 } as { precioUsd: number })).toBe('US$9/mes')
    expect(textoPrecioCatalogo({ precioUsd: 24, moneda: 'USD', precioMensual: 12900 } as { precioUsd: number })).toBe('US$24/mes')
    expect(textoPrecioCatalogo({ precioUsd: '49', moneda: 'USD' })).toBe('US$49/mes')
    expect(textoPrecioCatalogo({ precioUsd: 24, moneda: 'USD' })).not.toContain('₡')
    expect(textoPrecioCatalogo({ precioUsd: 12900, moneda: 'CRC' })).toBe('₡12.900/mes')
  })

  it('sin precio publicable (null, 0, ausente) no inventa monto ni dice «Gratis»', () => {
    for (const p of [{ precioUsd: null }, { precioUsd: 0 }, {}, null, undefined]) {
      expect(textoPrecioCatalogo(p)).toBe('Mensualidad del plan')
    }
    expect(textoPrecioCatalogo({ precioUsd: null, moneda: 'CRC' })).toBe('Mensualidad en colones')
  })

  it('el texto de moneda sigue a la moneda del backend', () => {
    expect(textoMonedaPlanes('USD')).toContain('mensualidad del plan se cobra en dólares (USD)')
    expect(textoMonedaPlanes('CRC')).toContain('mensualidad del plan se cobra en colones (CRC)')
    expect(textoMonedaPlanes('CRC')).toContain('productos se venden en colones')
  })
})

describe('Emprendedor en Admin › Planes: US$9 es precio de lista', () => {
  it('rotula «Precio de lista» solo a Emprendedor con monto', () => {
    expect(rotuloPrecioLista({ nombre: 'EMPRENDEDOR', precioUsd: 9, moneda: 'USD' })).toBe('Precio de lista')
    expect(rotuloPrecioLista({ nombre: 'EMPRENDEDOR', precioUsd: null })).toBeNull()
    expect(rotuloPrecioLista({ nombre: 'PYME', precioUsd: 24 })).toBeNull()
    expect(rotuloPrecioLista(null)).toBeNull()
  })
})
