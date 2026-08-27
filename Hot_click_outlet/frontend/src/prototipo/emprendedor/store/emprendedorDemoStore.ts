import { create } from 'zustand'
import { BODEGAS_DEMO } from '../data/bodegasDemo'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'
import { PEDIDOS_DEMO } from '../data/pedidosDemo'
import type { BodegaEmprendedor, CategoriaProducto, EstadoPublicacion, FormProducto, PedidoEmprendedor, ProductoEmprendedor } from '../types'

type AltaProducto = Omit<FormProducto, 'estado'> & { estado?: EstadoPublicacion }

type EmprendedorDemoStore = {
  productos: ProductoEmprendedor[]
  pedidos: PedidoEmprendedor[]
  bodegas: BodegaEmprendedor[]
  agregarProducto: (datos: AltaProducto) => void
  actualizarProducto: (id: string, datos: FormProducto) => void
  eliminarProducto: (id: string) => void
  marcarPedidoEnviado: (id: string) => void
  agregarBodega: (nombre: string, ubicacion: string) => void
}

/**
 * Estado local del prototipo Emprendedor. No llama al backend:
 * un click de demo no debe crear, editar ni borrar datos reales.
 */
export const useEmprendedorDemoStore = create<EmprendedorDemoStore>((set) => ({
  productos: PRODUCTOS_DEMO,
  pedidos: PEDIDOS_DEMO,
  bodegas: BODEGAS_DEMO,
  agregarProducto: (datos) =>
    set((estado) => ({
      productos: [productoDesdeForm(`demo-${Date.now()}`, datos), ...estado.productos],
    })),
  actualizarProducto: (id, datos) =>
    set((estado) => ({
      productos: estado.productos.map((item) =>
        item.id === id ? { ...productoDesdeForm(id, datos), recienAgregado: item.recienAgregado } : item,
      ),
    })),
  eliminarProducto: (id) =>
    set((estado) => ({ productos: estado.productos.filter((item) => item.id !== id) })),
  marcarPedidoEnviado: (id) =>
    set((estado) => ({
      pedidos: estado.pedidos.map((pedido) => (pedido.id === id ? { ...pedido, estado: 'Enviado' } : pedido)),
    })),
  agregarBodega: (nombre, ubicacion) =>
    set((estado) => ({
      bodegas: [...estado.bodegas, { id: `bodega-${Date.now()}`, nombre, ubicacion, productos: 0, principal: false }],
    })),
}))

function productoDesdeForm(id: string, datos: AltaProducto): ProductoEmprendedor {
  return {
    id,
    nombre: datos.nombre,
    categoria: datos.categoria,
    precio: Number(datos.precioVenta) || 0,
    precioCompra: Number(datos.precioCompra) || 0,
    estado: datos.estado ?? 'Publicado',
    stock: Number(datos.stock) || 0,
    recienAgregado: true,
    descripcion: datos.descripcion,
  }
}

export function esCategoriaProducto(valor: string): valor is CategoriaProducto {
  return valor === 'Tecnología' || valor === 'Ropa' || valor === 'Otro'
}
