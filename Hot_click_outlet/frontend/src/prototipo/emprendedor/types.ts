import type { EstadoPedidoVendedor } from '@/prototipo/compartido/estadoPedidoVendedor'

export type CategoriaProducto = 'Tecnología' | 'Ropa' | 'Otro'

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
  cliente: string
  total: number
  /** 'Pendiente' = pago confirmado, por despachar (ver estadoPedidoVendedor). */
  estado: EstadoPedidoVendedor
  /** Efectivo con retiro sin cobrar: se entrega en vez de despacharse (ver pagaAlRetirar). */
  pagaAlRetirar?: boolean
  fecha: string
  direccion: string
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
