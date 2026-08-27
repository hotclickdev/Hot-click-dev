import type { CategoriaProducto, ProductoEmprendedor } from './types'

function categoriaDe(nombre: string): CategoriaProducto {
  const texto = nombre.toLowerCase()
  if (texto.includes('ropa') || texto.includes('camiseta') || texto.includes('jean') || texto.includes('buzo')) {
    return 'Ropa'
  }
  if (texto.includes('tecno') || texto.includes('auricular') || texto.includes('mouse') || texto.includes('cargador')) {
    return 'Tecnología'
  }
  return 'Otro'
}

type ProductoApi = {
  id?: string | number
  nombre?: string
  categoriaNombre?: string
  precio?: number
  precioCompra?: number
  stock?: number
  descripcion?: string
  imagenUrl?: string
  visibleCatalogo?: boolean
}

export function mapearProductoApi(api: ProductoApi, indice: number): ProductoEmprendedor {
  const categoria = categoriaDe(api.categoriaNombre ?? api.nombre ?? '')
  return {
    id: String(api.id ?? `api-${indice}`),
    nombre: api.nombre || 'Producto',
    categoria: categoria === 'Otro' && api.categoriaNombre ? 'Tecnología' : categoria,
    precio: Number(api.precio ?? 0),
    precioCompra: Number(api.precioCompra ?? 0),
    estado: api.visibleCatalogo === false ? 'Pausado' : 'Publicado',
    stock: Number(api.stock ?? 0),
    recienAgregado: indice < 3,
    descripcion: api.descripcion || '',
    imagenUrl: api.imagenUrl || undefined,
  }
}
