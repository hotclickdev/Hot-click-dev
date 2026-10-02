import { describe, expect, it } from 'vitest'
import { formatMiles, formatPrice } from './format'
import useCartStore from '@/store/cartStore'
import type { ItemCarrito } from '@/types/carrito'
import { etiquetaPresupuestoCliente, linkWhatsAppCotizacion, type Encargo } from '@/services/encargoService'

describe('formatPrice', () => {
  it('usa punto de miles como en Figma', () => {
    expect(formatPrice(6200)).toBe('₡6.200')
    expect(formatPrice(22500)).toBe('₡22.500')
    expect(formatPrice(1234567)).toBe('₡1.234.567')
  })

  it('no agrupa por debajo de mil', () => {
    expect(formatPrice(0)).toBe('₡0')
    expect(formatPrice(999)).toBe('₡999')
  })

  it('tolera vacíos y texto numérico', () => {
    expect(formatPrice(null)).toBe('₡0')
    expect(formatPrice(undefined)).toBe('₡0')
    expect(formatPrice('12500')).toBe('₡12.500')
    expect(formatPrice('abc')).toBe('₡0')
  })

  it('redondea a colones enteros', () => {
    expect(formatPrice(1999.6)).toBe('₡2.000')
  })

  it('no deja espacios (ni NBSP) en el resultado', () => {
    expect(formatPrice(150000)).not.toMatch(/\s/)
    expect(formatMiles(4000)).toBe('4.000')
  })

  it('agrupa desde 4 dígitos sin espacio duro ni estrecho', () => {
    expect(formatMiles(1000)).toBe('1.000')
    expect(formatPrice(6200)).not.toMatch(/[\u00a0\u202f]/)
  })
})

describe('textos al comprador usan formatPrice', () => {
  it('WhatsApp del carrito', () => {
    useCartStore.setState({ items: [{ id: 1, nombre: 'Gorra', precio: 3100, cantidad: 2 } as ItemCarrito] })
    const msg = decodeURIComponent(useCartStore.getState().toWhatsAppMessage())
    expect(msg).toContain('x2 — ₡6.200')
    expect(msg).toContain('Total: ₡6.200')
  })

  it('presupuesto y cotización de encargos', () => {
    const encargo = { presupuestoTipo: 'RANGO', presupuestoMin: 5000, presupuestoMax: 12500, telefono: '8888-1234', nombreCliente: 'Ana', tokenPublico: 't' } as Encargo
    expect(etiquetaPresupuestoCliente(encargo)).toBe('₡5.000 – ₡12.500')
    expect(decodeURIComponent(linkWhatsAppCotizacion(encargo, 6200) ?? '')).toContain('cotizado en ₡6.200.')
  })
})
