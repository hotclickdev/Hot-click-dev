import { describe, expect, it } from 'vitest'
import { ENVIO } from './paquetesCompra'
import {
  erroresDatos,
  erroresDireccion,
  erroresPago,
  numeroCompraVisible,
  textoDireccion,
} from './validacionCompra'

const t = (clave: string) => clave
const direccionVacia = { provincia: '', canton: '', senas: '' }

describe('erroresDatos', () => {
  it('marca los tres campos vacíos', () => {
    expect(erroresDatos({ correo: '', telefono: '', nombre: ' ' }, t)).toEqual({
      correo: 'checkout.guestEmailRequired',
      telefono: 'checkout.phoneRequired',
      nombre: 'compra.datos.nombreRequerido',
    })
  })

  it('no devuelve errores con datos válidos', () => {
    expect(erroresDatos({ correo: 'ana@correo.cr', telefono: '8888 7777', nombre: 'Ana Mora' }, t)).toEqual({})
  })
})

describe('erroresDireccion', () => {
  it('no pide dirección si todos los paquetes se retiran en tienda', () => {
    const envios = { a: ENVIO.RETIRO, b: ENVIO.RETIRO }
    expect(erroresDireccion(direccionVacia, envios, t)).toEqual({})
  })

  it('pide provincia, cantón y señas si algún paquete va a domicilio', () => {
    const envios = { a: ENVIO.RETIRO, b: ENVIO.NORMAL_GAM }
    expect(erroresDireccion(direccionVacia, envios, t)).toEqual({
      provincia: 'compra.entrega.provinciaRequerida',
      canton: 'compra.entrega.cantonRequerido',
      senas: 'checkout.addressRequired',
    })
  })
})

describe('erroresPago', () => {
  it('SINPE exige comprobante; tarjeta no', () => {
    expect(erroresPago('SINPE', null, t)).toEqual({ comprobante: 'compra.pago.comprobanteRequerido' })
    expect(erroresPago('TILOPAY', null, t)).toEqual({})
  })
})

describe('textoDireccion', () => {
  it('une señas, cantón y provincia sin huecos', () => {
    expect(textoDireccion({ provincia: 'Heredia', canton: '', senas: ' Casa verde ' })).toBe('Casa verde, Heredia')
  })
})

describe('numeroCompraVisible', () => {
  it('quita el sufijo del paquete solo cuando hay varios', () => {
    expect(numeroCompraVisible('HC-1234-1', 3)).toBe('HC-1234')
    expect(numeroCompraVisible('HC-1234-1', 1)).toBe('HC-1234-1')
    expect(numeroCompraVisible(undefined, 2)).toBe('')
  })
})
