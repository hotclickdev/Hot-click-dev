import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import ItemRow from '../ItemRow'
import type { ItemCotizacionForm } from '../CotizacionForm'
import type { Producto } from '@/types/producto'

type El = ReactElement<Record<string, unknown> & { children?: unknown }>

// ItemRow no usa hooks: se invoca como función y se recorre el árbol para llegar a los handlers.
function buscar(nodo: unknown, pred: (e: El) => boolean): El[] {
  if (Array.isArray(nodo)) return nodo.flatMap(n => buscar(n, pred))
  if (!nodo || typeof nodo !== 'object' || !('props' in nodo)) return []
  const e = nodo as El
  return [...(pred(e) ? [e] : []), ...buscar(e.props.children, pred)]
}

const producto = { id: 7, nombreProducto: 'Silla', precioVenta: 10000 } as unknown as Producto

function fila(moneda: string, precioUnitario = 5000) {
  const cambios: Partial<ItemCotizacionForm>[] = []
  const item = { tipo: 'CATALOGO', precioUnitario, cantidad: 1, descuentoPorcentaje: 0 } as unknown as ItemCotizacionForm
  const arbol = ItemRow({ item, index: 0, productos: [producto], onChange: (_i, p) => { cambios.push(p) }, onRemove: () => {}, moneda })
  const precio = buscar(arbol, e => e.type === 'input' && e.props.min === 0 && e.props.max === undefined)[0]
  const select = buscar(arbol, e => e.type === 'select' && e.props.value !== undefined && String(e.props.value) === '')[0]
  return { cambios, precio, select }
}

describe('ItemRow — C2 unidad de precioUnitario (CRC colones, USD centavos)', () => {
  it('en USD el input muestra dólares y guarda centavos', () => {
    const { precio, cambios } = fila('USD')
    expect(precio.props.value).toBe(50)
    ;(precio.props.onChange as (e: unknown) => void)({ target: { value: '12.34' } })
    expect(cambios[0].precioUnitario).toBe(1234)
  })
  it('en CRC el input sigue en colones enteros', () => {
    const { precio, cambios } = fila('CRC')
    expect(precio.props.value).toBe(5000)
    ;(precio.props.onChange as (e: unknown) => void)({ target: { value: '7500' } })
    expect(cambios[0].precioUnitario).toBe(7500)
  })
  it('en USD no autollena con el precio en colones del catálogo', () => {
    const { select, cambios } = fila('USD', 0)
    ;(select.props.onChange as (e: unknown) => void)({ target: { value: '7' } })
    expect(cambios[0].precioUnitario).toBe(0)
  })
  it('en CRC autollena con precioVenta', () => {
    const { select, cambios } = fila('CRC', 0)
    ;(select.props.onChange as (e: unknown) => void)({ target: { value: '7' } })
    expect(cambios[0].precioUnitario).toBe(10000)
  })
})
