import { describe, expect, it, vi } from 'vitest'
import { cargarPaginasPedidos, type PaginaPedidos } from './cargarPaginasPedidos'

function paginas(contenido: number[][]): (pagina: number) => Promise<PaginaPedidos> {
  return vi.fn(async (pagina: number) => ({
    pedidos: (contenido[pagina] ?? []).map((id) => ({ id, compraId: 1 })),
    totalPages: contenido.length,
  }))
}

describe('cargarPaginasPedidos', () => {
  it('junta todas las páginas para que una compra no quede partida', async () => {
    const cargar = paginas([[1, 2], [3, 4], [5]])
    const pedidos = await cargarPaginasPedidos(cargar)
    expect(pedidos.map((p) => p.id)).toEqual([1, 2, 3, 4, 5])
    expect(cargar).toHaveBeenCalledTimes(3)
  })

  it('no pasa del tope de páginas', async () => {
    const cargar = paginas([[1], [2], [3], [4]])
    const pedidos = await cargarPaginasPedidos(cargar, 2)
    expect(pedidos.map((p) => p.id)).toEqual([1, 2])
    expect(cargar).toHaveBeenCalledTimes(2)
  })

  it('descarta el paquete repetido cuando la lista se corre por un pedido nuevo', async () => {
    const pedidos = await cargarPaginasPedidos(paginas([[1, 2], [2, 3]]))
    expect(pedidos.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('con el historial vacío hace una sola consulta', async () => {
    const cargar = vi.fn(async () => ({ pedidos: [], totalPages: 0 }))
    expect(await cargarPaginasPedidos(cargar)).toEqual([])
    expect(cargar).toHaveBeenCalledTimes(1)
  })
})
