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
  estado: 'Pendiente' | 'Enviado' | 'Entregado'
  fecha: string
  direccion: string
  productos: { id: string; nombre: string; cantidad: number; precio: number }[]
}

export type BodegaEmprendedor = {
  id: string
  nombre: string
  ubicacion: string
  productos: number
  principal: boolean
}

export type LineaTicket = {
  id: string
  nombre: string
  precio: number
  cantidad: number
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
