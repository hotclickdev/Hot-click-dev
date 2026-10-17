import { describe, expect, it } from 'vitest'
import { aPorFacturar, chipsConContador, datosTicoFactura, validarClave, validarConsecutivo } from './facturacionApi'

describe('S5-20 facturación', () => {
  it('copia los datos en el orden de TicoFactura', () => {
    const txt = datosTicoFactura({ ...aPorFacturar({ numero: 'HC-1' }), comprador: { nombre: 'Sofía', correo: 's@…' }, lineas: [{ descripcion: 'Sofá', cabys: '0000000000000', monto: 10 }] })
    expect(txt.split('\n')).toEqual(['Pedido HC-1', 'Comprador\tSofía\ts@…', 'Producto\tCABYS\tMonto', 'Sofá\t0000000000000\t10'])
  })
  it('clave de 50 dígitos y consecutivo de 20', () => {
    expect(validarClave('1'.repeat(50))).toBeNull()
    expect(validarClave('123')).toBeTruthy()
    expect(validarConsecutivo('0'.repeat(20))).toBeNull()
    expect(validarConsecutivo('0'.repeat(19))).toBeTruthy()
  })
  it('chips con contador', () => {
    const c = chipsConContador([{ e: 'a' }, { e: 'b' }, { e: 'a' }], [{ id: 'a', texto: 'A', filtro: (f) => f.e === 'a' }])
    expect(c).toEqual([{ id: 'todos', texto: 'Todos', cantidad: 3 }, { id: 'a', texto: 'A', cantidad: 2 }])
  })
})
