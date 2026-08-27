/** Datos locales tipados del prototipo Visitante (Figma 96:128). */

export const VISITANTE_BASE = '/prototipo/visitante'

export const COSTO_ENVIO_CRC = 2500
export const WHATSAPP_HOTCLICK = '50686667888'

export type CategoriaShop = 'Todos' | 'Tecnología' | 'Ropa' | 'Hogar'

export type ProductoVisitante = {
  id: string
  nombre: string
  negocio: string
  negocioId: string
  precio: number
  categoria: Exclude<CategoriaShop, 'Todos'>
  agotado?: boolean
  descripcion: string
}

export type NegocioVisitante = {
  id: string
  nombre: string
  inicial: string
  plan: 'PLAN PYME' | 'EMPRENDIMIENTO'
  rubro: string
  detalle: string
  rating: number
  productos: number
  bio: string
}

export type ItemCarritoVisitante = {
  productoId: string
  cantidad: number
}

export const PRODUCTOS_VISITANTE: ProductoVisitante[] = [
  {
    id: 'auriculares',
    nombre: 'Auriculares Bluetooth X200',
    negocio: 'QA2 Emprendedor',
    negocioId: 'qa2',
    precio: 18500,
    categoria: 'Tecnología',
    descripcion: 'Auriculares inalámbricos con estuche de carga. Autonomía de 20 horas.',
  },
  {
    id: 'zapatillas',
    nombre: 'Zapatillas Runner Pro',
    negocio: 'TechZone CR',
    negocioId: 'techzone',
    precio: 32000,
    categoria: 'Ropa',
    descripcion: 'Zapatillas para running con suela de amortiguación.',
  },
  {
    id: 'vestido',
    nombre: 'Vestido Floral Verano',
    negocio: 'Moda Urbana',
    negocioId: 'moda-urbana',
    precio: 18900,
    categoria: 'Ropa',
    descripcion: 'Vestido floral de verano, tela liviana.',
  },
  {
    id: 'lampara',
    nombre: 'Lámpara LED Escritorio',
    negocio: 'Casa & Deco',
    negocioId: 'casa-deco',
    precio: 9500,
    categoria: 'Hogar',
    descripcion: 'Lámpara LED de escritorio con brazo flexible.',
  },
  {
    id: 'mouse',
    nombre: 'Mouse Inalámbrico Pro',
    negocio: 'QA2 Emprendedor',
    negocioId: 'qa2',
    precio: 12400,
    categoria: 'Tecnología',
    descripcion: 'Mouse inalámbrico ergonómico para trabajo diario.',
  },
  {
    id: 'cojin',
    nombre: 'Cojín Decorativo XL',
    negocio: 'Casa & Deco',
    negocioId: 'casa-deco',
    precio: 6500,
    categoria: 'Hogar',
    agotado: true,
    descripcion:
      'Cojín decorativo de 45x45cm, relleno de fibra siliconada, funda desmontable y lavable. Ideal para sala o cuarto.',
  },
]

export const NEGOCIOS_VISITANTE: NegocioVisitante[] = [
  {
    id: 'casa-deco',
    nombre: 'Casa & Deco',
    inicial: 'C',
    plan: 'PLAN PYME',
    rubro: 'Hogar y decoración',
    detalle: 'San José',
    rating: 4.7,
    productos: 4,
    bio: 'Cojines, lámparas y accesorios para hacer tu hogar más cómodo. Envíos a todo Costa Rica.',
  },
  {
    id: 'qa2',
    nombre: 'QA2 Emprendedor',
    inicial: 'Q',
    plan: 'EMPRENDIMIENTO',
    rubro: 'Tecnología',
    detalle: 'Envíos a todo el país',
    rating: 4.5,
    productos: 2,
    bio: 'Accesorios de tecnología para el día a día. Envíos a todo Costa Rica.',
  },
]

export const CARRITO_VISITANTE: ItemCarritoVisitante[] = [
  { productoId: 'auriculares', cantidad: 1 },
  { productoId: 'cojin', cantidad: 2 },
]

export const CHIPS_SHOP: CategoriaShop[] = ['Todos', 'Tecnología', 'Ropa', 'Hogar']

export const CHIPS_ASISTENTE = ['Decoración', 'Muebles', 'Iluminación', 'Jardín', 'Cocina'] as const

export const FAVORITOS_IDS = ['cojin', 'auriculares'] as const

export type PedidoVisitante = {
  id: string
  negocio: string
  total: number
  estado: 'En camino' | 'Entregado'
}

export const PEDIDOS_VISITANTE: PedidoVisitante[] = [
  { id: '4021', negocio: 'Casa & Deco', total: 34000, estado: 'En camino' },
  { id: '4015', negocio: 'QA2 Emprendedor', total: 18500, estado: 'Entregado' },
]

export type DireccionVisitante = {
  id: string
  alias: string
  linea: string
  principal?: boolean
}

export const DIRECCIONES_VISITANTE: DireccionVisitante[] = [
  { id: 'casa', alias: 'Casa', linea: 'San José, Costa Rica', principal: true },
  { id: 'trabajo', alias: 'Trabajo', linea: 'Heredia, Costa Rica' },
]

export type MetodoPagoVisitante = {
  id: string
  titulo: string
  detalle: string
  inicial: string
  principal?: boolean
}

export const METODOS_PAGO_VISITANTE: MetodoPagoVisitante[] = [
  { id: 'visa', titulo: 'Visa •••• 4412', detalle: 'Vence 08/28', inicial: 'V', principal: true },
  { id: 'sinpe', titulo: 'SINPE Móvil', detalle: '8888-0000', inicial: 'S' },
]

export type NotificacionVisitante = {
  id: string
  tono: 'ok' | 'info' | 'aviso'
  titulo: string
  detalle: string
  cuando: string
}

export const NOTIFICACIONES_VISITANTE: NotificacionVisitante[] = [
  {
    id: 'envio',
    tono: 'ok',
    titulo: '¡Tu pedido fue enviado!',
    detalle: 'Pedido #4021 va en camino, llega en 2-3 días.',
    cuando: 'Hace 1 hora',
  },
  {
    id: 'respuesta',
    tono: 'info',
    titulo: 'Casa & Deco respondió tu pregunta',
    detalle: '“Sí, la funda se puede lavar a máquina.”',
    cuando: 'Hace 3 horas',
  },
  {
    id: 'carrito',
    tono: 'aviso',
    titulo: 'Tu carrito te espera',
    detalle: 'Tenés 1 producto guardado hace unos días.',
    cuando: 'Ayer',
  },
]

export type FaqVisitante = {
  id: string
  pregunta: string
  respuesta: string
}

export const FAQ_VISITANTE: FaqVisitante[] = [
  {
    id: 'seguir',
    pregunta: '¿Cómo sigo mi pedido?',
    respuesta: 'En Mis pedidos ves el estado. Cuando hay guía, te llega un correo con el enlace de Correos CR.',
  },
  {
    id: 'cancelar',
    pregunta: '¿Cómo cambio o cancelo una compra?',
    respuesta: 'Si todavía no se despachó, escribinos por WhatsApp con el número de pedido.',
  },
  {
    id: 'danado',
    pregunta: '¿Qué hago si el producto llega dañado?',
    respuesta: 'Tenés 15 días de garantía. Contactanos por WhatsApp con fotos del empaque y del producto.',
  },
]

export function visitanteRuta(segmento = ''): string {
  if (!segmento) return VISITANTE_BASE
  return `${VISITANTE_BASE}/${segmento.replace(/^\//, '')}`
}

export function productoPorId(id: string | undefined): ProductoVisitante {
  return PRODUCTOS_VISITANTE.find((item) => item.id === id) ?? PRODUCTOS_VISITANTE[5]
}

export function negocioPorId(id: string | undefined): NegocioVisitante {
  return NEGOCIOS_VISITANTE.find((item) => item.id === id) ?? NEGOCIOS_VISITANTE[0]
}

export function filtrarProductos(categoria: CategoriaShop, consulta: string): ProductoVisitante[] {
  const q = consulta.trim().toLowerCase()
  return PRODUCTOS_VISITANTE.filter((item) => {
    if (categoria !== 'Todos' && item.categoria !== categoria) return false
    if (!q) return true
    return `${item.nombre} ${item.negocio}`.toLowerCase().includes(q)
  })
}

export function lineasCarrito(): Array<ProductoVisitante & { cantidad: number }> {
  return CARRITO_VISITANTE.map((linea) => {
    const producto = productoPorId(linea.productoId)
    return { ...producto, cantidad: linea.cantidad }
  })
}

export function subtotalCarrito(): number {
  return lineasCarrito().reduce((acc, item) => acc + item.precio * item.cantidad, 0)
}
