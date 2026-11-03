import { describe, expect, it } from 'vitest'
import { metodoInicialTienda, payloadCheckoutTienda, proveedorTienda } from './tiendaPagoOnvo'

describe('QA5 ALTO: checkout de tienda por ONVO', () => {
  it('abre con ONVO, nunca con SINPE manual', () => {
    expect(metodoInicialTienda()).toBe('ONVO')
  })
  it('fail-closed: sin ONVO publicado no hay proveedor', () => {
    expect(proveedorTienda('ONVO', false, true)).toBeNull()
    expect(proveedorTienda('ONVO', true, false)).toBe('ONVO')
    expect(proveedorTienda('SINPE', true, false)).toBeNull()
    expect(proveedorTienda('SINPE', false, true)).toBe('SINPE')
    expect(proveedorTienda('SINPE_MOVIL', true, true)).toBeNull()
  })
  it('arma el mismo payload de /payments/checkout', () => {
    const p = payloadCheckoutTienda({
      correoCliente: ' a@b.cr ', telefonoCliente: '88888888', direccionEntrega: 'Casa', metodoEnvio: 'DOMICILIO',
      provincia: 'San José', canton: 'Escazú', notas: '', items: [{ productoId: 1, cantidad: 2 }],
    }, 'ONVO', true)
    expect(p).toMatchObject({ provider: 'ONVO', metodoEnvio: 'ENVIO_NORMAL_GAM', guestEmail: 'a@b.cr', items: [{ productoId: 1, cantidad: 2 }] })
    const r = payloadCheckoutTienda({
      correoCliente: 'a@b.cr', telefonoCliente: '', direccionEntrega: '', metodoEnvio: 'RETIRO', notas: 'x', items: [],
    }, 'ONVO', false)
    expect(r.metodoEnvio).toBe('RETIRO_EN_TIENDA')
    expect(r.guestEmail).toBeUndefined()
  })
})
