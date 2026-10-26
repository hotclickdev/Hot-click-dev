import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ItemRow from '../ItemRow'
import type { ItemCotizacionForm } from '../CotizacionForm'

const item = { precioUnitario: 5000, cantidad: 1, descuentoPorcentaje: 0 } as unknown as ItemCotizacionForm

const fila = (moneda?: string) => renderToStaticMarkup(
  h('table', null, h('tbody', null,
    h(ItemRow, { item, index: 0, productos: [], onChange: () => {}, onRemove: () => {}, moneda }))))

describe('ItemRow — C1 moneda del subtotal', () => {
  it('en USD el subtotal de la línea sale en US$, no en ₡', () => {
    const html = fila('USD')
    expect(html).toContain('US$50')
    expect(html).not.toContain('₡')
  })
  it('sin moneda sigue en colones', () => {
    expect(fila()).toContain('₡')
  })
})
