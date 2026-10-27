import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { normalizarCotizacion, resolverTotalCobro } from './cotizacionPos'
import { formatMontoPos } from './posHelpers'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
const { LineasTicket } = await import('./StepCobro')

describe('POS StepCobro — total con IVA cuando hay factura (M4)', () => {
  const cot = { subtotal: 15000, descuento: 1500, impuesto: 1755, total: 15255 }

  it('sin factura cobra el total local, sin IVA ni espera', () => {
    expect(resolverTotalCobro(13500, false, cot)).toEqual({ total: 13500, impuesto: 0, pendiente: false })
  })

  it('con factura cobra el total cotizado por el backend (IVA incluido)', () => {
    expect(resolverTotalCobro(13500, true, cot)).toEqual({ total: 15255, impuesto: 1755, pendiente: false })
  })

  it('con factura y sin cotización queda pendiente (fail-closed)', () => {
    expect(resolverTotalCobro(13500, true, null).pendiente).toBe(true)
  })

  it('normaliza la respuesta (con o sin envoltura data) y rechaza basura', () => {
    expect(normalizarCotizacion(cot)).toEqual(cot)
    expect(normalizarCotizacion({ data: cot })).toEqual(cot)
    expect(normalizarCotizacion({ total: 'x' })).toBeNull()
    expect(normalizarCotizacion({ total: -1 })).toBeNull()
    expect(normalizarCotizacion(null)).toBeNull()
  })

  it('el ticket muestra la línea de IVA y el total con IVA', () => {
    const items = [{ id: 1, nombre: 'Camisa', precio: 5000, cantidad: 3 }] as never
    const html = renderToStaticMarkup(createElement(LineasTicket, { items, descuento: 1500, impuesto: 1755, total: 15255 }))
    expect(html).toContain('pos.cobro.iva')
    expect(html).toContain('+₡' + formatMontoPos(1755))
    expect(html).toContain('₡' + formatMontoPos(15255))
    const sinIva = renderToStaticMarkup(createElement(LineasTicket, { items, descuento: 1500, total: 13500 }))
    expect(sinIva).not.toContain('pos.cobro.iva')
  })
})
