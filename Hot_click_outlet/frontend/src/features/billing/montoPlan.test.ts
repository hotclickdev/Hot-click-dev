import { describe, expect, it } from 'vitest'
import { montoCobroVisible, montoPlanVisible, rotuloPrecioLista, textoPrecioCatalogo } from './montoPlan'
import { TEXTO_MONEDA_PLANES } from '@/config/planesPrecios'

describe('monto del cobro antes de confirmar', () => {
  it('muestra el USD que el backend mando en el cobro', () => {
    expect(montoCobroVisible({ montoUsd: 24 })).toBe('US$24/mes')
  })

  it('el catalogo tambien usa precioUsd y no los colones', () => {
    expect(montoPlanVisible({ precioUsd: 24 })).toBe('US$24/mes')
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
    expect(textoPrecioCatalogo({ precioUsd: 9, precioMensual: 0 } as { precioUsd: number })).toBe('US$9/mes')
    expect(textoPrecioCatalogo({ precioUsd: 24, precioMensual: 12900 } as { precioUsd: number })).toBe('US$24/mes')
    expect(textoPrecioCatalogo({ precioUsd: '49' })).toBe('US$49/mes')
    expect(textoPrecioCatalogo({ precioUsd: 24 })).not.toContain('₡')
  })

  it('sin precio publicable (null, 0, ausente) no inventa monto ni dice «Gratis»', () => {
    for (const p of [{ precioUsd: null }, { precioUsd: 0 }, {}, null, undefined]) {
      expect(textoPrecioCatalogo(p)).toBe('Mensualidad en dólares')
    }
  })

  it('el texto de moneda no contradice el USD visible: productos en colones, mensualidad en dólares', () => {
    expect(TEXTO_MONEDA_PLANES).toContain('productos se venden en colones')
    expect(TEXTO_MONEDA_PLANES).toContain('mensualidad del plan se cobra en dólares (USD)')
    expect(TEXTO_MONEDA_PLANES).not.toMatch(/precios (están )?en colones/i)
  })
})

describe('Emprendedor en Admin › Planes: US$9 es precio de lista', () => {
  it('rotula «Precio de lista» solo a Emprendedor con monto', () => {
    expect(rotuloPrecioLista({ nombre: 'EMPRENDEDOR', precioUsd: 9 })).toBe('Precio de lista')
    expect(rotuloPrecioLista({ nombre: 'EMPRENDEDOR', precioUsd: null })).toBeNull()
    expect(rotuloPrecioLista({ nombre: 'PYME', precioUsd: 24 })).toBeNull()
    expect(rotuloPrecioLista(null)).toBeNull()
  })
})
