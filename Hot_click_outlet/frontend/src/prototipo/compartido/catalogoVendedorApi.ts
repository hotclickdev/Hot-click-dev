import { productService, denormalizeProduct, normalizeProduct } from '@/services/productService'
import type { Producto } from '@/types/producto'
import type { ProductoEmprendedor } from '@/prototipo/emprendedor/types'
import type { ProductoMock } from '@/prototipo/compartido/mock'
import { MODO_PRECIO_PERSONALIZADO_FASE1, modosPrecioPersonalizadoHabilitados } from './personalizadoProductoHelpers'

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
  imagenUrl?: string
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
    esPersonalizado: p.esPersonalizado === true,
    modoPrecioPersonalizado: p.modoPrecioPersonalizado ?? undefined,
    precioPersonalizadoMin: p.precioPersonalizadoMin ?? undefined,
    precioPersonalizadoMax: p.precioPersonalizadoMax ?? undefined,
    instruccionesPersonalizacion: p.instruccionesPersonalizacion ?? undefined,
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
    imagenUrl: e.imagenUrl,
    esPersonalizado: e.esPersonalizado,
    modoPrecioPersonalizado: e.modoPrecioPersonalizado,
    precioPersonalizadoMin: e.precioPersonalizadoMin,
    precioPersonalizadoMax: e.precioPersonalizadoMax,
    instruccionesPersonalizacion: e.instruccionesPersonalizacion,
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
  const personalizado = datos.esPersonalizado === true
  const modo = personalizado && modosPrecioPersonalizadoHabilitados()
    ? (datos.modoPrecioPersonalizado ?? MODO_PRECIO_PERSONALIZADO_FASE1)
    : MODO_PRECIO_PERSONALIZADO_FASE1
  const dto = {
    ...denormalizeProduct({
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion,
      precioCompra: personalizado && modo !== 'FIJO' ? '0' : datos.precioCompra,
      precioVenta: personalizado && modo !== 'FIJO' ? (modo === 'RANGO' ? (datos.precioPersonalizadoMin ?? '0') : '0') : datos.precioVenta,
      stock: datos.stock,
      esPersonalizado: personalizado,
      modoPrecioPersonalizado: personalizado ? modo : datos.modoPrecioPersonalizado,
      precioPersonalizadoMin: personalizado && modo === 'RANGO' ? datos.precioPersonalizadoMin : undefined,
      precioPersonalizadoMax: personalizado && modo === 'RANGO' ? datos.precioPersonalizadoMax : undefined,
      instruccionesPersonalizacion: datos.instruccionesPersonalizacion,
      imagenUrl: datos.imagenUrl ?? '',
    }),
    visibleCatalogo: datos.estado !== 'Pausado',
    tags: datos.categoria || null,
  }
  if (personalizado && !modosPrecioPersonalizadoHabilitados()) {
    dto.modoPrecioPersonalizado = MODO_PRECIO_PERSONALIZADO_FASE1
    dto.precioVenta = 0
    dto.precioCompra = 0
    dto.precioPersonalizadoMin = null
    dto.precioPersonalizadoMax = null
  }
  return dto
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
