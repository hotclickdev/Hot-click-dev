import type { Id } from '@/types/api'

export const TABS = [
  { id: 'url', label: 'URL del sitio' },
  { id: 'pdf', label: 'Catálogo PDF' },
  { id: 'csv', label: 'Archivo CSV' },
] as const

export type ImportarTabId = (typeof TABS)[number]['id']

export const CONDICIONES = [
  { value: 'NUEVO',      label: 'Nuevo'      },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO',      label: 'Usado'      },
] as const

export type CategoriaImportar = {
  id: Id
  nombreCategoria?: string
}

export type MarcaImportar = {
  id: Id
  nombreMarca?: string
}

export type BodegaImportar = {
  id: Id
  nombre?: string
  nombreBodega?: string
}

export type EmpresaImportar = {
  id: Id
  nombreComercial?: string
  nombreEmpresa?: string
}

export type ProductoImportado = {
  _id: number
  _sel: boolean
  _ventaFmt?: string
  _costoFmt?: string
  _colorLabel?: string | null
  _colorHex?: string | null
  nombreProducto?: string
  descripcionCorta?: string
  imagenPrincipalUrl?: string | null
  marcaTexto?: string | null
  precioVenta?: number
  precioCompra?: number
  categoriaId?: number | null
  marcaId?: number | null
  bodegaId?: number | null
  stockActual?: number | string
  condicion?: string
  grupoVarianteId?: string | null
  colorVariante?: string | null
}

export type ToastImportar = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

export function fmtColones(v: number | string | null | undefined): string {
  return (v || v === 0) ? Number(v).toLocaleString('es-CR') : ''
}

export function parseColones(str: string | null | undefined): number {
  return parseInt(String(str ?? '').replace(/[^0-9]/g, ''), 10) || 0
}

export function innerData(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) return (data as { data?: unknown }).data
  return undefined
}

export function mensajeErrorImportar(err: unknown, respaldo: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return respaldo
}
