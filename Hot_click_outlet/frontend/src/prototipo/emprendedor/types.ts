import type { EstadoPedidoVendedor } from '@/prototipo/compartido/estadoPedidoVendedor'

/** Nombre real de la categoría del producto (NP-10: antes se forzaba a Tecnología/Ropa/Otro). */
export type CategoriaProducto = string

export type EstadoPublicacion = 'Publicado' | 'Pausado'

export type ProductoEmprendedor = {
  id: string
  nombre: string
  categoria: CategoriaProducto
  precio: number
  precioCompra: number
  estado: EstadoPublicacion
  stock: number
  recienAgregado: boolean
  descripcion: string
  imagenUrl?: string
  categoriaId?: string
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string
  precioPersonalizadoMin?: number
  precioPersonalizadoMax?: number
  instruccionesPersonalizacion?: string
}

export type PedidoEmprendedor = {
  id: string
  /** S4-20: número propio de la tienda (`null` en pedidos viejos). */
  numeroTienda?: number | null
  numeroPedido?: string
  cliente: string
  total: number
  /** 'Pendiente' = pago confirmado, por despachar (ver estadoPedidoVendedor). */
  estado: EstadoPedidoVendedor
  /** Efectivo con retiro sin cobrar: se entrega en vez de despacharse (ver pagaAlRetirar). */
  pagaAlRetirar?: boolean
  fecha: string
  direccion: string
  /** NP-18: contacto del cliente (invitado incluido); solo llega en pedidos del propio negocio. */
  telefono?: string
  correo?: string
  /** Pedido de tienda propia esperando que el vendedor confirme el pago. */
  confirmaPago?: boolean
  origen?: string
  productos: { id: string; nombre: string; cantidad: number; precio: number }[]
}

export type BodegaEmprendedor = {
  id: string
  nombre: string
  ubicacion: string
  productos: number
  principal: boolean
  latitud?: number | null
  longitud?: number | null
}

export type FormProducto = {
  nombre: string
  precioCompra: string
  precioVenta: string
  descripcion: string
  stock: string
  categoria: CategoriaProducto
  estado: EstadoPublicacion
}
