import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'
import type { Producto } from '@/types/producto'
import { ToastProvider } from '@/components/ui/Toast'
import ProductCard from './ProductCard'

const base = {
  id: 1, nombre: 'Zapatos running rojo', precio: 6200, stock: 10, empresaNombre: 'Bruma Café', imagenUrl: 'foto.jpg',
}
const pintar = (extra: Partial<Producto> = {}) =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ToastProvider, null, createElement(ProductCard, { product: { ...base, ...extra } as unknown as Producto }))))

describe('ProductCard del comprador (Figma 5:23)', () => {
  it('normal: precio con punto de miles, vendedor y sin insignia', () => {
    const html = pintar()
    expect(html).toContain('₡6.200')
    expect(html).toContain('Bruma Café')
    expect(html).not.toContain('Quedan')
    expect(html).not.toContain('<s ')
  })

  it('la foto ocupa el ancho del borde (calc(100%+2px)) para medir 280 como Figma', () => {
    expect(pintar()).toContain('w-[calc(100%+2px)]')
  })

  it('stock bajo: insignia Quedan N', () => {
    expect(pintar({ stock: 4 })).toContain('Quedan 4')
  })

  it('oferta: precio de oferta, lista tachada e insignia Oferta', () => {
    const html = pintar({ precio: 15000, precioOferta: 11000 })
    expect(html).toContain('₡11.000')
    expect(html).toMatch(/<s [^>]*>.*₡15\.000<\/s>/)
    expect(html).toContain('>Oferta<')
  })

  it('oferta con stock bajo: manda Quedan N y se omite la insignia Oferta', () => {
    const html = pintar({ precio: 15000, precioOferta: 11000, stock: 3 })
    expect(html).toContain('Quedan 3')
    expect(html).not.toContain('>Oferta<')
    expect(html).toContain('₡15.000')
  })

  it('agotado: precio sustituido y botón deshabilitado', () => {
    const html = pintar({ stock: 0 })
    expect(html).toContain('Agotado')
    expect(html).not.toContain('₡6.200')
    expect(html).toMatch(/<button[^>]*\sdisabled(=|\s|>)/)
  })

  it('cotizable con stock 0: no queda como agotado y el botón sigue activo', () => {
    const html = pintar({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })
    expect(html).toContain('A cotizar')
    expect(html).toContain('Hecho a pedido')
    expect(html).not.toContain('Agotado')
    expect(html).not.toMatch(/<button[^>]*\sdisabled(=|\s|>)/)
  })

  it('personalizado de precio FIJO: Hecho a pedido con su precio', () => {
    const html = pintar({ esPersonalizado: true, modoPrecioPersonalizado: 'FIJO', precio: 11000 })
    expect(html).toContain('Hecho a pedido')
    expect(html).toContain('₡11.000')
  })

  it('precio por rango: “Desde” arriba y el mínimo con punto de miles', () => {
    const html = pintar({ stock: 0, esPersonalizado: true, modoPrecioPersonalizado: 'RANGO', precioPersonalizadoMin: 25000, precioPersonalizadoMax: 60000 })
    expect(html).toContain('>Desde<')
    expect(html).toContain('₡25.000')
    expect(html).not.toContain('Agotado')
  })
})
