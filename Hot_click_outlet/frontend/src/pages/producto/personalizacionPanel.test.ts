import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '@/i18n'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { ToastProvider } from '@/components/ui/Toast'
import { textoPrecioProducto } from '@/utils/precioProducto'
import PersonalizacionPanel from './PersonalizacionPanel'

const base = {
  id: 289,
  nombre: 'Zapatos pintados',
  precio: 1,
  stock: 1,
  esPersonalizado: true,
  instruccionesPersonalizacion: 'Contame la talla y los colores.',
} as unknown as Producto

function html(over: Partial<Producto>, pers: PersonalizacionCarrito = {} as PersonalizacionCarrito, requiereContacto = true) {
  return renderToStaticMarkup(
    createElement(ToastProvider, null, createElement(PersonalizacionPanel, {
      product: { ...base, ...over } as Producto,
      tallaSeleccionada: null,
      personalizacion: pers,
      onChange: () => {},
      contacto: { nombre: '', email: '', telefono: '' },
      onContactoChange: () => {},
      requiereContacto,
    })),
  )
}

describe('PersonalizacionPanel · ficha personalizada (Figma 44:1849 + manual)', () => {
  it('a cotizar: presupuesto en tarjetas, contacto con título y pasos numerados', async () => {
    await i18n.changeLanguage('es')
    const h = html({ modoPrecioPersonalizado: 'COTIZACION' } as Partial<Producto>)
    expect(h).toContain('Personalizá tu pedido')
    expect(h).toContain('Contame la talla y los colores.')
    expect(h).toContain('role="radiogroup"')
    expect(h).toContain('border-hc-blue-600 bg-hc-blue-50')
    expect(h).toContain('Tus datos para que el artista te responda')
    expect(h).toContain('autoComplete="email"')
    expect(h).toContain('¿Cómo funciona?')
    expect(h).toContain('Precio a cotizar')
    expect(h).toMatch(/>1<\/span>[^<]*Subís tus fotos y notas/)
    expect(h).toContain('rounded-[12px]')
    expect(h).toContain('focus:shadow-[0_0_0_3px_var(--hc-blue-100)]')
    expect(h).not.toContain('rounded-xl')
  })

  it('rango: muestra los campos en ₡ cuando el cliente elige "Tengo un rango"', () => {
    const h = html(
      { modoPrecioPersonalizado: 'RANGO', precioPersonalizadoMin: 10000, precioPersonalizadoMax: 25000 } as Partial<Producto>,
      { presupuestoTipo: 'RANGO' } as PersonalizacionCarrito,
    )
    expect(h).toContain('aria-label="Mínimo ₡"')
    expect(h).toContain('aria-label="Máximo ₡"')
    expect(h).toContain('placeholder="Mínimo"')
  })

  it('precio fijo: sin presupuesto, contacto ni "¿Cómo funciona?" (como el frame)', () => {
    const h = html({ modoPrecioPersonalizado: 'FIJO', precio: 11000 } as Partial<Producto>, {} as PersonalizacionCarrito, false)
    expect(h).toContain('Personalizá tu pedido')
    expect(h).not.toContain('radiogroup')
    expect(h).not.toContain('¿Cómo funciona?')
  })

  it('buscador en vivo: un producto a cotizar no muestra ₡1', () => {
    expect(textoPrecioProducto({ esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION', precio: 1 })).toBe('A cotizar')
  })
})
