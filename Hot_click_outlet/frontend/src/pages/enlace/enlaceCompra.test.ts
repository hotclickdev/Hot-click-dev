import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cargarCarritoDeEnlace,
  enlaceDeRespuesta,
  guardarDatosEnlace,
  leerDatosEnlace,
  limpiarDatosEnlace,
  type EnlaceAbierto,
  type ItemEnlace,
} from './enlaceCompra'
import type { Producto } from '@/types/producto'

function item(parcial: Partial<ItemEnlace>): ItemEnlace {
  return {
    productoId: 11, nombre: 'Leche deslactosada 1 L', imagenUrl: null, cantidad: 3, cantidadSolicitada: 3,
    precioUnitario: 1500, precioCreado: 1500, disponible: true, ...parcial,
  }
}

function enlace(items: ItemEnlace[], parcial: Partial<EnlaceAbierto> = {}): EnlaceAbierto {
  return {
    vence: '2026-12-08T10:00:00', reservaHasta: '2026-12-07T10:30:00', nombreCliente: 'Ana',
    telefonoMascara: '****0000', precioCambio: false, stockCambio: false, totalCreado: 4500, totalActual: 4500,
    items, ...parcial,
  }
}

/** El entorno de pruebas es node: sessionStorage se simula con un Map. */
function memoriaDeSesion() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => { datos.set(k, v) },
    removeItem: (k: string) => { datos.delete(k) },
    clear: () => datos.clear(),
  }
}

describe('enlace de compra del bot', () => {
  beforeEach(() => { vi.stubGlobal('sessionStorage', memoriaDeSesion()) })

  it('acepta la respuesta desenvuelta o con el sobre del ResponseDTO, y rechaza basura', () => {
    const dto = enlace([item({})])
    expect(enlaceDeRespuesta(dto)).toBe(dto)
    expect(enlaceDeRespuesta({ success: true, data: dto })).toBe(dto)
    expect(enlaceDeRespuesta(null)).toBeNull()
    expect(enlaceDeRespuesta({ message: 'Enlace no disponible', data: null })).toBeNull()
  })

  it('reemplaza el carrito con lo reservado: la cantidad del servidor, no la pedida', async () => {
    const agregar = vi.fn(() => true)
    const vaciar = vi.fn()
    const leche = { id: 11, nombre: 'Leche' } as unknown as Producto
    const n = await cargarCarritoDeEnlace(
      enlace([item({ cantidad: 2, cantidadSolicitada: 3 })], { stockCambio: true }),
      { obtenerProducto: async () => leche, vaciar, agregar },
    )
    expect(n).toBe(1)
    expect(vaciar).toHaveBeenCalledTimes(1)
    expect(agregar).toHaveBeenCalledWith(leche, 2)
  })

  it('omite líneas agotadas o cuya ficha ya no existe', async () => {
    const agregar = vi.fn(() => true)
    const n = await cargarCarritoDeEnlace(
      enlace([item({ productoId: 1, disponible: false, cantidad: 0 }), item({ productoId: 2 }), item({ productoId: 3 })]),
      { obtenerProducto: async (id) => (id === 3 ? ({ id } as unknown as Producto) : null), vaciar: vi.fn(), agregar },
    )
    expect(n).toBe(1)
    expect(agregar).toHaveBeenCalledTimes(1)
  })

  it('guarda para el checkout el código, el nombre y solo el teléfono enmascarado', () => {
    guardarDatosEnlace({ codigo: 'A'.repeat(24), nombre: 'Ana', telefonoMascara: '****0000' })
    expect(leerDatosEnlace()).toEqual({ codigo: 'A'.repeat(24), nombre: 'Ana', telefonoMascara: '****0000' })
    limpiarDatosEnlace()
    expect(leerDatosEnlace()).toBeNull()
  })

  it('ignora datos guardados dañados', () => {
    sessionStorage.setItem('hc-enlace-compra', '{no es json')
    expect(leerDatosEnlace()).toBeNull()
    sessionStorage.setItem('hc-enlace-compra', JSON.stringify({ nombre: 'Ana' }))
    expect(leerDatosEnlace()).toBeNull()
  })
})
