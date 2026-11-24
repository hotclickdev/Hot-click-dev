import api from '@/services/api'
import { productService } from '@/services/productService'
import type { Producto } from '@/types/producto'

/**
 * Enlace de compra del bot de IA (`/c/:codigo`, AG-07/AG-09). El servidor recalcula precios, reserva el stock
 * 30 minutos y devuelve el carrito. El teléfono llega enmascarado: el completo no sale del servidor y el
 * checkout lo completa con `enlaceCodigo`.
 */
export type ItemEnlace = {
  productoId: number
  nombre: string
  imagenUrl: string | null
  /** Unidades reservadas (las que se cargan al carrito). */
  cantidad: number
  cantidadSolicitada: number
  precioUnitario: number
  precioCreado: number
  disponible: boolean
}

export type EnlaceAbierto = {
  vence: string
  reservaHasta: string | null
  nombreCliente: string | null
  telefonoMascara: string | null
  precioCambio: boolean
  stockCambio: boolean
  totalCreado: number
  totalActual: number
  items: ItemEnlace[]
}

type CuerpoEnlace = EnlaceAbierto & { data?: EnlaceAbierto }

const CLAVE = 'hc-enlace-compra'

export type DatosEnlace = { codigo: string; nombre: string; telefonoMascara: string }

/** `api` suele desenvolver el `ResponseDTO`; se aceptan ambas formas. */
export function enlaceDeRespuesta(data: unknown): EnlaceAbierto | null {
  const cuerpo = data as CuerpoEnlace | null
  const dto = cuerpo?.items ? cuerpo : cuerpo?.data
  return dto && Array.isArray(dto.items) ? dto : null
}

export async function abrirEnlace(codigo: string): Promise<EnlaceAbierto | null> {
  const { data } = await api.get(`/public/enlace/${encodeURIComponent(codigo)}`)
  return enlaceDeRespuesta(data)
}

/** Lo que el checkout necesita recordar del enlace (solo la pestaña actual). */
export function guardarDatosEnlace(datos: DatosEnlace): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch { /* sin sessionStorage el checkout simplemente no prellena */ }
}

export function leerDatosEnlace(): DatosEnlace | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return null
    const d = JSON.parse(crudo) as Partial<DatosEnlace>
    return typeof d.codigo === 'string' && d.codigo
      ? { codigo: d.codigo, nombre: d.nombre ?? '', telefonoMascara: d.telefonoMascara ?? '' }
      : null
  } catch {
    return null
  }
}

export function limpiarDatosEnlace(): void {
  try { sessionStorage.removeItem(CLAVE) } catch { /* nada que limpiar */ }
}

type AgregarAlCarrito = (producto: Producto, cantidad: number) => boolean

/**
 * Reemplaza el carrito por el del enlace: cada línea con la ficha pública actual del producto y la cantidad que
 * quedó reservada. Devuelve cuántas líneas se cargaron (las no disponibles se omiten).
 */
export async function cargarCarritoDeEnlace(
  enlace: EnlaceAbierto,
  deps: {
    obtenerProducto?: (id: number) => Promise<Producto | null>
    vaciar: () => void
    agregar: AgregarAlCarrito
  },
): Promise<number> {
  const obtener = deps.obtenerProducto ?? (async (id: number) => {
    try {
      const { data } = await productService.getById(id)
      return (data ?? null) as Producto | null
    } catch {
      return null
    }
  })
  const lineas = enlace.items.filter((i) => i.disponible && i.cantidad > 0)
  const productos = await Promise.all(lineas.map((i) => obtener(i.productoId)))
  deps.vaciar()
  let cargadas = 0
  lineas.forEach((linea, indice) => {
    const producto = productos[indice]
    if (producto && deps.agregar(producto, linea.cantidad)) cargadas += 1
  })
  return cargadas
}
