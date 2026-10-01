import { beforeEach, describe, expect, it, vi } from 'vitest'
import usePedidoExtrasStore from '@/store/pedidoExtrasStore'
import { guardarUltimoPedido, leerUltimoPedido, limpiarUltimoPedido } from '@/utils/ultimoPedido'
import { emailCarritoYaCapturado, guardarEmailCarritoLocal, paquetesConEnvioElegido } from '@/pages/carrito/cartHelpers'
import { opcionesEnvio, paquetesDesdeItems } from './checkoutHelpers'
import type { ItemCheckout } from './checkoutHelpers'
import { digitosTelefono, formatoTelefonoCampo, telefonoDesdeCampo } from './pasosCheckoutHelpers'
import { cantonesDeProvincia, direccionCompleta, esDestinoGAM, PROVINCIAS_CR } from './ubicacionesCR'
import { totalesConCodigos } from './useCodigosPedido'

/** Almacenamiento en memoria: el entorno de pruebas es Node, sin `localStorage` ni `sessionStorage`. */
function almacenamientoEnMemoria() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    clear: () => datos.clear(),
  }
}

describe('ubicaciones de Costa Rica', () => {
  it('tiene 7 provincias y 84 cantones (con Monteverde y Puerto Jiménez)', () => {
    expect(PROVINCIAS_CR).toHaveLength(7)
    expect(PROVINCIAS_CR.reduce((suma, p) => suma + cantonesDeProvincia(p).length, 0)).toBe(84)
  })

  it('el destino se considera GAM por cantón y sin destino se asume GAM', () => {
    expect(esDestinoGAM('', '')).toBe(true)
    expect(esDestinoGAM('San José', 'Escazú')).toBe(true)
    expect(esDestinoGAM('Guanacaste', 'Liberia')).toBe(false)
    expect(esDestinoGAM('Limón', 'Talamanca')).toBe(false)
  })

  it('arma la dirección del pedido como señas, cantón y provincia', () => {
    expect(direccionCompleta(' casa verde ', 'Escazú', 'San José')).toBe('casa verde, Escazú, San José')
    expect(direccionCompleta('', '', '')).toBe('')
  })
})

describe('teléfono del checkout', () => {
  it('guarda con prefijo +506 y muestra 8888 1234', () => {
    expect(telefonoDesdeCampo('8888 1234')).toBe('+50688881234')
    expect(formatoTelefonoCampo('+50688881234')).toBe('8888 1234')
    expect(digitosTelefono('+506 8888-1234 extra99')).toBe('88881234')
    expect(telefonoDesdeCampo('')).toBe('')
  })
})

describe('totales con cupón y gift card', () => {
  it('aplica el porcentaje al subtotal y la gift card sobre el total con envío', () => {
    expect(totalesConCodigos(100000, 12000, 10, 0)).toEqual({ descuento: 10000, giftCard: 0, total: 102000 })
    expect(totalesConCodigos(100000, 12000, 0, 50000)).toEqual({ descuento: 0, giftCard: 50000, total: 62000 })
    expect(totalesConCodigos(10000, 4000, 0, 90000)).toEqual({ descuento: 0, giftCard: 14000, total: 0 })
  })
})

describe('store de extras del pedido', () => {
  beforeEach(() => usePedidoExtrasStore.getState().reiniciar())

  it('conserva notas, cupón y gift card y se reinicia', () => {
    const s = usePedidoExtrasStore.getState()
    s.setNotas('timbre roto')
    s.setCuponCodigo('BIENVENIDA')
    s.setCuponDescuento(15)
    s.setGcSaldo(5000)
    expect(usePedidoExtrasStore.getState().notas).toBe('timbre roto')
    expect(usePedidoExtrasStore.getState().cuponDescuento).toBe(15)
    usePedidoExtrasStore.getState().reiniciar()
    expect(usePedidoExtrasStore.getState().notas).toBe('')
    expect(usePedidoExtrasStore.getState().cuponCodigo).toBeNull()
    expect(usePedidoExtrasStore.getState().gcSaldo).toBe(0)
  })
})

const itemA: ItemCheckout = { id: 1, cantidad: 2, precio: 1000, bodegaId: 'A', bodegaNombre: 'Tienda A', bodegaPermiteRetiro: true, empresaNombre: 'Casa Luna' }
const itemB: ItemCheckout = { id: 2, cantidad: 1, precio: 5000, bodegaId: 'B', bodegaNombre: 'Tienda B', empresaNombre: 'Bruma' }

describe('paquetes con el envío elegido', () => {
  it('suma el costo del método de cada paquete y marca la encomienda como variable', () => {
    const paquetes = paquetesDesdeItems([itemA, itemB])
    const resumen = paquetesConEnvioElegido(paquetes, { A: 'ENVIO_RAPIDO', B: 'ENCOMIENDA_PROPIA' })
    expect(resumen.map((p) => p.envio)).toEqual([5000, 0])
    expect(resumen.map((p) => p.envioVaria)).toEqual([false, true])
    expect(resumen[0].negocio).toBe('Casa Luna')
  })

  it('el orden de las opciones es el de Figma y el retiro va al final', () => {
    const valores = opcionesEnvio({ id: 'A', nombre: 'Tienda A' }).map((o) => o.value)
    expect(valores[0]).toBe('ENVIO_NORMAL_GAM')
    expect(valores.at(-1)).toBe('RETIRO_EN_TIENDA')
    expect(opcionesEnvio(null).some((o) => o.value === 'RETIRO_EN_TIENDA')).toBe(false)
  })
})

describe('resumen del último pedido', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', almacenamientoEnMemoria())
    limpiarUltimoPedido()
  })

  it('se guarda y se lee durante la sesión', () => {
    guardarUltimoPedido({ nombre: 'Andrea', correo: 'a@b.cr', paquetes: [{ negocio: 'Casa Luna', productos: 2, metodoEnvio: 'ENVIO_NORMAL_GAM' }] })
    expect(leerUltimoPedido()?.nombre).toBe('Andrea')
    expect(leerUltimoPedido()?.paquetes).toHaveLength(1)
    limpiarUltimoPedido()
    expect(leerUltimoPedido()).toBeNull()
  })
})

describe('correo del carrito ya capturado', () => {
  beforeEach(() => vi.stubGlobal('localStorage', almacenamientoEnMemoria()))

  it('no se vuelve a pedir después de guardarlo', () => {
    expect(emailCarritoYaCapturado()).toBe(false)
    guardarEmailCarritoLocal('x@y.cr')
    expect(emailCarritoYaCapturado()).toBe(true)
  })
})
