import { productService, denormalizeProduct, normalizeProduct } from '@/services/productService'
import type { Producto } from '@/types/producto'
import type { ProductoEmprendedor } from '@/prototipo/emprendedor/types'
import type { ProductoMock } from '@/prototipo/compartido/mock'

export type DatosProductoVendedor = {
  nombre: string
  precioCompra: string
  precioVenta: string
  descripcion: string
  stock: string
  categoria: string
  estado?: 'Publicado' | 'Pausado'
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: 'FIJO' | 'RANGO' | 'COTIZACION'
  precioPersonalizadoMin?: string
  precioPersonalizadoMax?: string
  instruccionesPersonalizacion?: string
}

function listaDesdeRespuesta(data: Producto[] | { content: Producto[] }): Producto[] {
  return Array.isArray(data) ? data : data.content
}

function mapCategoria(nombre: string | undefined): ProductoEmprendedor['categoria'] {
  const n = (nombre ?? '').toLowerCase()
  if (n.includes('ropa') || n.includes('moda')) return 'Ropa'
  if (n.includes('hogar') || n.includes('otro')) return 'Otro'
  return 'Tecnología'
}

/** Producto de API → fila Figma Emprendedor. */
export function aProductoEmprendedor(p: Producto): ProductoEmprendedor {
  return {
    id: String(p.id ?? ''),
    nombre: p.nombre ?? 'Producto',
    categoria: mapCategoria(p.categoriaNombre),
    precio: Number(p.precio ?? 0),
    precioCompra: Number(p.precioCompra ?? 0),
    estado: p.visibleCatalogo === false ? 'Pausado' : 'Publicado',
    stock: Number(p.stock ?? 0),
    recienAgregado: false,
    descripcion: p.descripcion ?? '',
    imagenUrl: p.imagenUrl || undefined,
  }
}

/** Misma fila para PYME / Negocio Plus. */
export function aProductoSeller(p: Producto): ProductoMock {
  const e = aProductoEmprendedor(p)
  return {
    id: e.id,
    nombre: e.nombre,
    categoria: e.categoria,
    precio: e.precio,
    precioCompra: e.precioCompra,
    stock: e.stock,
    estado: e.estado,
    reciente: e.recienAgregado,
    descripcion: e.descripcion,
  }
}

export async function cargarProductosVendedor(): Promise<Producto[]> {
  const res = await productService.adminGetAll(0, 100)
  const crudos = listaDesdeRespuesta(res.data as Producto[] | { content: Producto[] })
  return crudos
    .map((item) => normalizeProduct(item))
    .filter((item): item is Producto => Boolean(item))
}

function cuerpoProducto(datos: DatosProductoVendedor) {
  return {
    ...denormalizeProduct({
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion,
      precioCompra: datos.precioCompra,
      precioVenta: datos.precioVenta,
      stock: datos.stock,
      esPersonalizado: datos.esPersonalizado === true,
      modoPrecioPersonalizado: datos.modoPrecioPersonalizado,
      precioPersonalizadoMin: datos.precioPersonalizadoMin,
      precioPersonalizadoMax: datos.precioPersonalizadoMax,
      instruccionesPersonalizacion: datos.instruccionesPersonalizacion,
    }),
    visibleCatalogo: datos.estado !== 'Pausado',
    tags: datos.categoria || null,
  }
}

export async function publicarProductoVendedor(datos: DatosProductoVendedor) {
  await productService.create(cuerpoProducto(datos))
}

export async function guardarProductoVendedor(id: string, datos: DatosProductoVendedor) {
  await productService.update(id, cuerpoProducto(datos))
}

export async function borrarProductoVendedor(id: string) {
  await productService.delete(id)
}

export function mensajeErrorProducto(err: unknown, respaldo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: string } | string } }).response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object' && data.message) return data.message
  return respaldo
}
