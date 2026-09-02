import type { PlanId } from './plan'

export type EstadoProducto = 'Publicado' | 'Pausado'
export type CategoriaProducto = 'Tecnología' | 'Ropa' | 'Otro'

export type ProductoMock = {
  id: string
  nombre: string
  categoria: CategoriaProducto
  precio: number
  precioCompra: number
  stock: number
  estado: EstadoProducto
  reciente: boolean
  descripcion: string
  imagenUrl?: string
  categoriaId?: string
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string
  precioPersonalizadoMin?: number
  precioPersonalizadoMax?: number
  instruccionesPersonalizacion?: string
}

export type EstadoPedido = 'Pendiente' | 'Enviado' | 'Entregado' | 'Cancelado'

export type ItemPedido = {
  nombre: string
  cantidad: number
  precio: number
}

export type PedidoMock = {
  id: string
  cliente: string
  total: number
  estado: EstadoPedido
  fecha: string
  direccion: string
  sucursal?: string
  items: ItemPedido[]
}

export const PRODUCTOS: ProductoMock[] = [
  {
    id: 'auriculares',
    nombre: 'Auriculares Bluetooth X200',
    categoria: 'Tecnología',
    precio: 18500,
    precioCompra: 11000,
    stock: 8,
    estado: 'Publicado',
    reciente: true,
    descripcion:
      'Auriculares inalámbricos con cancelación de ruido, batería de larga duración y estuche de carga incluido. Ideal para uso diario.',
  },
  {
    id: 'camiseta',
    nombre: 'Camiseta Oversize Negra',
    categoria: 'Ropa',
    precio: 9900,
    precioCompra: 4200,
    stock: 14,
    estado: 'Publicado',
    reciente: true,
    descripcion: 'Camiseta oversize de algodón, corte holgado. Color negro.',
  },
  {
    id: 'cargador',
    nombre: 'Cargador USB-C 30W',
    categoria: 'Tecnología',
    precio: 7200,
    precioCompra: 3100,
    stock: 20,
    estado: 'Publicado',
    reciente: true,
    descripcion: 'Cargador rápido USB-C de 30W para celular y accesorios.',
  },
  {
    id: 'mouse',
    nombre: 'Mouse Inalámbrico Pro',
    categoria: 'Tecnología',
    precio: 12400,
    precioCompra: 5600,
    stock: 9,
    estado: 'Publicado',
    reciente: false,
    descripcion: 'Mouse inalámbrico ergonómico para trabajo diario.',
  },
  {
    id: 'funda',
    nombre: 'Funda para Celular',
    categoria: 'Tecnología',
    precio: 4800,
    precioCompra: 1800,
    stock: 30,
    estado: 'Pausado',
    reciente: false,
    descripcion: 'Funda protectora compatible con modelos recientes.',
  },
  {
    id: 'jean',
    nombre: 'Jean Slim Fit Azul',
    categoria: 'Ropa',
    precio: 21000,
    precioCompra: 9500,
    stock: 6,
    estado: 'Publicado',
    reciente: false,
    descripcion: 'Jean slim fit azul, denim rígido.',
  },
  {
    id: 'buzo',
    nombre: 'Buzo Canguro Gris',
    categoria: 'Ropa',
    precio: 15500,
    precioCompra: 7000,
    stock: 5,
    estado: 'Pausado',
    reciente: false,
    descripcion: 'Buzo canguro con capucha, gris jaspeado.',
  },
  {
    id: 'cojin',
    nombre: 'Cojín Decorativo XL',
    categoria: 'Ropa',
    precio: 6500,
    precioCompra: 2200,
    stock: 11,
    estado: 'Publicado',
    reciente: false,
    descripcion: 'Cojín decorativo tamaño XL para sala.',
  },
]

export const PEDIDOS_PYME: PedidoMock[] = [
  {
    id: '2015',
    cliente: 'Carlos Rodríguez',
    total: 12400,
    estado: 'Pendiente',
    fecha: '26/08/2026',
    direccion: 'San José, CR',
    items: [{ nombre: 'Mouse Inalámbrico Pro', cantidad: 1, precio: 12400 }],
  },
  {
    id: '2014',
    cliente: 'María Fernández',
    total: 9900,
    estado: 'Enviado',
    fecha: '25/08/2026',
    direccion: 'Heredia, CR',
    items: [{ nombre: 'Camiseta Oversize Negra', cantidad: 1, precio: 9900 }],
  },
  {
    id: '2011',
    cliente: 'Diego Salas',
    total: 21000,
    estado: 'Entregado',
    fecha: '22/08/2026',
    direccion: 'Cartago, CR',
    items: [{ nombre: 'Jean Slim Fit Azul', cantidad: 1, precio: 21000 }],
  },
]

export const PEDIDOS_PLUS: PedidoMock[] = [
  {
    id: '1042',
    cliente: 'Diego Salas',
    total: 34000,
    estado: 'Pendiente',
    fecha: '26/08/2026',
    direccion: 'San José, CR',
    sucursal: 'San José Centro',
    items: [
      { nombre: 'Auriculares Bluetooth X200', cantidad: 1, precio: 18500 },
      { nombre: 'Cojín Decorativo XL', cantidad: 2, precio: 6500 },
    ],
  },
  {
    id: '1041',
    cliente: 'Ana Jiménez',
    total: 18500,
    estado: 'Enviado',
    fecha: '25/08/2026',
    direccion: 'Heredia, CR',
    sucursal: 'Heredia Plaza',
    items: [{ nombre: 'Auriculares Bluetooth X200', cantidad: 1, precio: 18500 }],
  },
  {
    id: '1039',
    cliente: 'Fernanda Solís',
    total: 52900,
    estado: 'Entregado',
    fecha: '23/08/2026',
    direccion: 'San José, CR',
    sucursal: 'San José Centro',
    items: [{ nombre: 'Jean Slim Fit Azul', cantidad: 1, precio: 21000 }],
  },
  {
    id: '1037',
    cliente: 'Ricardo Ureña',
    total: 9900,
    estado: 'Cancelado',
    fecha: '21/08/2026',
    direccion: 'Cartago, CR',
    sucursal: 'Cartago Norte',
    items: [{ nombre: 'Camiseta Oversize Negra', cantidad: 1, precio: 9900 }],
  },
]

export function productoPorId(id: string): ProductoMock | undefined {
  return PRODUCTOS.find((item) => item.id === id)
}

export function pedidosDelPlan(plan: PlanId): PedidoMock[] {
  return plan === 'negocioPlus' ? PEDIDOS_PLUS : PEDIDOS_PYME
}

export function pedidoPorId(plan: PlanId, id: string): PedidoMock | undefined {
  return pedidosDelPlan(plan).find((item) => item.id === id)
}
