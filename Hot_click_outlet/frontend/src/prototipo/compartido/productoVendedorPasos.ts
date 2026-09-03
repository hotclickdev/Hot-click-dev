import type { PasoFormulario } from './formularioPorPasosHelpers'
import { idCategoriaValido } from './categoriaVendedor'
import {
  type ModoPrecioPersonalizado,
  errorCatalogoProducto,
  errorPreciosPersonalizado,
} from './personalizadoProductoHelpers'

export const PASOS_PRODUCTO_CATALOGO: readonly PasoFormulario[] = [
  { id: 'foto', titulo: 'Foto del producto', opcional: true },
  { id: 'identidad', titulo: 'Nombre y categoría' },
  { id: 'precios', titulo: 'Precios' },
  { id: 'detalle', titulo: 'Descripción y stock' },
]

export const PASOS_PRODUCTO_PERSONALIZADO: readonly PasoFormulario[] = [
  { id: 'foto', titulo: 'Foto del producto', opcional: true },
  { id: 'identidad', titulo: 'Nombre y categoría' },
  { id: 'cobro', titulo: 'Forma de cobro' },
  { id: 'detalle', titulo: 'Detalles para el cliente' },
]

export const PASOS_PRODUCTO_EDITAR_CATALOGO: readonly PasoFormulario[] = [
  ...PASOS_PRODUCTO_CATALOGO,
  { id: 'estado', titulo: 'Estado de publicación' },
]

export const PASOS_PRODUCTO_EDITAR_PERSONALIZADO: readonly PasoFormulario[] = [
  ...PASOS_PRODUCTO_PERSONALIZADO,
  { id: 'estado', titulo: 'Estado de publicación' },
]

export type DatosPasoProducto = Readonly<{
  personalizado: boolean
  nombre: string
  categoriaId: string
  compra: string
  venta: string
  stock: string
  descripcion: string
  instrucciones: string
  modoPrecio: ModoPrecioPersonalizado
  precioMin: string
  precioMax: string
}>

export function pasosProducto(personalizado: boolean, editar: boolean): readonly PasoFormulario[] {
  if (editar) {
    return personalizado ? PASOS_PRODUCTO_EDITAR_PERSONALIZADO : PASOS_PRODUCTO_EDITAR_CATALOGO
  }
  return personalizado ? PASOS_PRODUCTO_PERSONALIZADO : PASOS_PRODUCTO_CATALOGO
}

/** Validación por índice de paso (null = ok). */
export function validarPasoProducto(paso: number, datos: DatosPasoProducto, editar: boolean): string | null {
  const lista = pasosProducto(datos.personalizado, editar)
  const id = lista[paso]?.id
  if (!id) return null
  if (id === 'identidad') return validarIdentidad(datos)
  if (id === 'precios') return errorCatalogoProducto(false, datos.venta, '1')
  if (id === 'cobro') {
    return errorPreciosPersonalizado(true, datos.modoPrecio, datos.venta, datos.precioMin, datos.precioMax)
  }
  if (id === 'detalle') return validarDetalle(datos)
  return null
}

function validarIdentidad(datos: DatosPasoProducto): string | null {
  if (!datos.nombre.trim()) return 'Escribí el nombre del producto.'
  if (!idCategoriaValido(datos.categoriaId)) return 'Seleccioná una categoría.'
  return null
}

function validarDetalle(datos: DatosPasoProducto): string | null {
  if (datos.personalizado) return null
  return errorCatalogoProducto(false, '1', datos.stock)
}
