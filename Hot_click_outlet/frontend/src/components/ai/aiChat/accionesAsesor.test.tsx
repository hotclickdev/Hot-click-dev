import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import AccionesCarrito from './AccionesCarrito'
import { accionesCarrito } from './aiChatHelpers'
import type { AiChatMensaje, AiChatProducto } from './aiChatHelpers'

const taza = { id: 10, nombre: 'Taza azul', precio: 5000 } as unknown as AiChatProducto

const msg = (acciones: AiChatMensaje['acciones'], productos: AiChatProducto[] = [taza]): AiChatMensaje => ({
  rol: 'assistant', texto: 'Listo', productos, acciones,
})

describe('asesor web: acciones de carrito', () => {
  it('toma solo AGREGAR_CARRITO bien formadas con producto presente en el mensaje', () => {
    const r = accionesCarrito(msg([
      { tipo: 'AGREGAR_CARRITO', productoId: 10, cantidad: 2 },
      { tipo: 'AGREGAR_CARRITO', productoId: 99, cantidad: 1 },
      { tipo: 'AGREGAR_CARRITO', productoId: 10, cantidad: 0 },
      { tipo: 'AGREGAR_CARRITO', productoId: 10, cantidad: 11 },
      { tipo: 'AGREGAR_CARRITO', productoId: 1.5, cantidad: 1 },
      { tipo: 'otro', productoId: 10, cantidad: 1 },
    ]))
    expect(r).toHaveLength(1)
    expect(r[0].cantidad).toBe(2)
    expect(r[0].producto.id).toBe(10)
  })

  it('pinta el botón con cantidad y nombre, en es/en/pt', () => {
    const html = renderToStaticMarkup(createElement(AccionesCarrito, {
      mensaje: msg([{ tipo: 'AGREGAR_CARRITO', productoId: 10, cantidad: 2 }]), onAgregar: () => {},
    }))
    expect(html).toContain('Taza azul')
    expect(html).toContain('ai-chat-acciones-asesor')
  })

  it('el chat de la tienda solo se pinta con wa.me y cuando se piden los enlaces', () => {
    const a = msg([
      { tipo: 'whatsapp', label: 'Chat de la tienda', url: 'https://wa.me/50688887777' },
      { tipo: 'whatsapp', label: 'x', url: 'https://evil.test/1' },
    ])
    const con = renderToStaticMarkup(createElement(AccionesCarrito, { mensaje: a, onAgregar: () => {}, incluirEnlaces: true }))
    expect(con).toContain('https://wa.me/50688887777')
    expect(con).not.toContain('evil.test')
    expect(renderToStaticMarkup(createElement(AccionesCarrito, { mensaje: a, onAgregar: () => {} }))).toBe('')
  })
})
