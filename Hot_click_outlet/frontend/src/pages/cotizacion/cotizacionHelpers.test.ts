import { describe, expect, it } from 'vitest'
import { datosDelCliente, montoCotizacion, textoLinea } from './cotizacionHelpers'

describe('línea de la cotización', () => {
  it('cantidad, precio unitario y descuento', () => {
    expect(textoLinea({ cantidad: 20, unidadMedida: 'Unidades', precioUnitario: 11000, descuentoPorcentaje: 10 }, 'CRC'))
      .toBe('20 unidades × ₡11.000 · 10% desc.')
  })

  it('sin unidad de medida usa singular o plural y omite el descuento en cero', () => {
    expect(textoLinea({ cantidad: 1, precioUnitario: 7900 }, 'CRC')).toBe('1 unidad × ₡7.900')
    expect(textoLinea({ cantidad: 5, precioUnitario: 7900, descuentoPorcentaje: 0 }, 'CRC')).toBe('5 unidades × ₡7.900')
  })
})

describe('montos', () => {
  it('el colón lleva punto de miles, como en Figma', () => {
    expect(montoCotizacion(198000)).toBe('₡198.000')
    expect(montoCotizacion(undefined)).toBe('₡0')
  })

  it('el dólar conserva el formato del servicio (centavos)', () => {
    expect(montoCotizacion(12550, 'USD')).toBe('$125.50')
  })
})

describe('bloque PARA', () => {
  it('une los datos que existen y no deja separadores sueltos', () => {
    expect(datosDelCliente({ cliente: { razonSocial: 'Café Aroma S.A.', cedulaJuridica: '3-101-000000', correo: 'compras@cafearoma.cr' } }))
      .toEqual({ nombre: 'Café Aroma S.A.', detalle: 'Cédula jurídica 3-101-000000 · compras@cafearoma.cr' })
  })

  it('cae al nombre comercial, al nombre del cliente o a un guion', () => {
    expect(datosDelCliente({ cliente: { nombreComercial: 'Aroma' } }).nombre).toBe('Aroma')
    expect(datosDelCliente({ nombreCliente: 'Ana' }).nombre).toBe('Ana')
    expect(datosDelCliente({})).toEqual({ nombre: '—', detalle: '' })
  })

  it('conserva teléfono, dirección y contacto principal', () => {
    expect(datosDelCliente({ cliente: { telefono: '2222-0000', direccion: 'San José', contactoPrincipal: 'Luis' } }).detalle)
      .toBe('2222-0000 · San José · Attn: Luis')
  })
})
