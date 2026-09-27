import { describe, expect, it } from 'vitest'
import {
  ENVIO,
  agruparPaquetes,
  envioTotal,
  enviosVigentes,
  opcionesEntrega,
  payloadPaquetes,
  requiereDireccion,
  tienePaqueteDe,
  totalesCompra,
  type ItemPaquete,
} from './paquetesCompra'

function item(id: number, empresaId: number | null, extra: Partial<ItemPaquete> = {}): ItemPaquete {
  return {
    id,
    cantidad: 1,
    precio: 10000,
    empresaId,
    empresaNombre: empresaId ? `Negocio ${empresaId}` : null,
    bodegaId: empresaId ? empresaId * 10 : 1,
    bodega: { id: empresaId ? empresaId * 10 : 1, provincia: 'San José' },
    ...extra,
  }
}

describe('agruparPaquetes', () => {
  it('arma un paquete por negocio en orden de llegada', () => {
    const paquetes = agruparPaquetes([item(1, 9), item(2, 7), item(3, 9, { cantidad: 2 })])

    expect(paquetes.map((p) => [p.numero, p.empresaId, p.cantidadProductos, p.subtotal])).toEqual([
      [1, 9, 3, 30000],
      [2, 7, 1, 10000],
    ])
  })

  it('usa la empresa de la bodega cuando el producto no la trae', () => {
    const [paquete] = agruparPaquetes([item(1, null, { bodega: { id: 20, empresaId: 8 } })])
    expect(paquete.empresaId).toBe(8)
  })

  it('marca fuera del GAM según la provincia de origen', () => {
    const [gam, fuera] = agruparPaquetes([
      item(1, 7, { bodega: { id: 70, provincia: 'San José' } }),
      item(2, 8, { bodega: { id: 80, provincia: 'Guanacaste' } }),
    ])
    expect(gam.fueraGam).toBe(false)
    expect(fuera.fueraGam).toBe(true)
  })
})

describe('tienePaqueteDe', () => {
  it('sabe si el negocio del producto ya tiene paquete en el carrito', () => {
    const carrito = [item(1, 9), item(2, null, { bodega: { id: 20, empresaId: 8 } })]
    expect(tienePaqueteDe(carrito, item(3, 9))).toBe(true)
    expect(tienePaqueteDe(carrito, item(4, 8))).toBe(true)
    expect(tienePaqueteDe(carrito, item(5, 7))).toBe(false)
    expect(tienePaqueteDe([], item(6, 9))).toBe(false)
  })
})

describe('opcionesEntrega', () => {
  it('fuera del GAM no ofrece envío rápido', () => {
    const [paquete] = agruparPaquetes([item(1, 8, { bodega: { id: 80, provincia: 'Limón' } })])
    expect(opcionesEntrega(paquete).map((o) => o.metodo)).toEqual([ENVIO.NORMAL_FUERA_GAM, ENVIO.ENCOMIENDA])
  })

  it('retiro solo si todo el paquete sale de una bodega que lo permite', () => {
    const permite = { bodegaPermiteRetiro: true, bodegaId: 70, bodega: { id: 70, provincia: 'San José', canton: 'Escazú' } }
    const [conRetiro] = agruparPaquetes([item(1, 7, permite), item(2, 7, permite)])
    const [mezclado] = agruparPaquetes([item(1, 7, permite), item(2, 7, { ...permite, bodegaId: 71 })])

    expect(opcionesEntrega(conRetiro).at(-1)?.metodo).toBe(ENVIO.RETIRO)
    expect(opcionesEntrega(mezclado).some((o) => o.metodo === ENVIO.RETIRO)).toBe(false)
  })

  it('la encomienda muestra "Varía" y no suma al total', () => {
    const [paquete] = agruparPaquetes([item(1, 7)])
    const encomienda = opcionesEntrega(paquete).find((o) => o.metodo === ENVIO.ENCOMIENDA)
    expect(encomienda?.precio).toBeNull()
    expect(envioTotal([paquete], { [paquete.clave]: ENVIO.ENCOMIENDA })).toBe(0)
  })
})

describe('envíos y payload', () => {
  it('suma un envío por paquete y reemplaza métodos que ya no aplican', () => {
    const paquetes = agruparPaquetes([item(1, 7), item(2, 8, { bodega: { id: 80, provincia: 'Guanacaste' } })])
    const envios = enviosVigentes(paquetes, { 'empresa-7': ENVIO.RAPIDO, 'empresa-8': ENVIO.RAPIDO })

    expect(envios).toEqual({ 'empresa-7': ENVIO.RAPIDO, 'empresa-8': ENVIO.NORMAL_FUERA_GAM })
    expect(envioTotal(paquetes, envios)).toBe(9000)
  })

  it('manda la bodega solo en paquetes con retiro', () => {
    const permite = { bodegaPermiteRetiro: true, bodegaId: 70, bodega: { id: 70 } }
    const paquetes = agruparPaquetes([item(1, 7, permite), item(2, 8)])
    const envios = { 'empresa-7': ENVIO.RETIRO, 'empresa-8': ENVIO.NORMAL_GAM }

    expect(payloadPaquetes(paquetes, envios)).toEqual([
      { empresaId: 7, metodoEnvio: ENVIO.RETIRO, bodegaId: 70 },
      { empresaId: 8, metodoEnvio: ENVIO.NORMAL_GAM },
    ])
    expect(requiereDireccion(envios)).toBe(true)
    expect(requiereDireccion({ 'empresa-7': ENVIO.RETIRO })).toBe(false)
  })
})

describe('totalesCompra', () => {
  const paquetes = agruparPaquetes([item(1, 7), item(2, 8, { cantidad: 2 })])
  const envios = { 'empresa-7': ENVIO.NORMAL_GAM, 'empresa-8': ENVIO.RAPIDO }

  it('el cupón solo descuenta el paquete de su negocio', () => {
    const totales = totalesCompra(paquetes, envios, { codigo: 'LUNA10', descuento: 10, empresaId: 8 })
    expect(totales).toMatchObject({ cantidadProductos: 3, subtotal: 30000, envio: 9000, descuento: 2000, total: 37000 })
  })

  it('la tarjeta de regalo cubre hasta el total del paquete de su negocio', () => {
    const giftCard = { codigo: 'GC1', saldo: 50000, empresaId: 7 }
    const totales = totalesCompra(paquetes, envios, null, giftCard)
    expect(totales.giftCard).toBe(14000)
    expect(totales.total).toBe(25000)
  })

  it('el descuento SINPE va por negocio sobre productos − cupón + envío', () => {
    const cupon = { codigo: 'LUNA10', descuento: 10, empresaId: 8 }
    const totales = totalesCompra(paquetes, envios, cupon, null, { 8: 5 })
    expect(totales).toMatchObject({ descuento: 2000, descuentoSinpe: 1150, total: 35850 })
  })

  it('redondea el descuento SINPE como el backend (mitad hacia arriba)', () => {
    expect(totalesCompra(paquetes, envios, null, null, { 7: 0.025 }).descuentoSinpe).toBe(4)
  })

  it('sin descuentos SINPE (tarjeta) el total no cambia', () => {
    expect(totalesCompra(paquetes, envios, null, null, {})).toMatchObject({ descuentoSinpe: 0, total: 39000 })
  })

  it('la tarjeta de regalo cubre el paquete ya con el descuento SINPE', () => {
    const giftCard = { codigo: 'GC1', saldo: 50000, empresaId: 7 }
    const totales = totalesCompra(paquetes, envios, null, giftCard, { 7: 5 })
    expect(totales.giftCard).toBe(13300)
    expect(totales.total).toBe(25000)
  })
})
