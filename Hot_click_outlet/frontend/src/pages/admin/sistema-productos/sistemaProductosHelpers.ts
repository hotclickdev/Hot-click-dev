import type { CSSProperties } from 'react'
import type { Pagina } from '@/types/api'
import type { Producto } from '@/types/producto'
import type { CategoriaAdmin } from '../productos/productosHelpers'

export const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
export const PAGE_SIZE = 20
export const STOCK_BAJO_MAX = 3

export type FormSistemaProducto = {
  nombre: string
  descripcion: string
  precioVenta: string | number
  stock: string | number
  categoriaId: string
  sku: string
  imagenUrl: string
  bodegaId: string | number
}

export type FiltrosSistemaProductos = {
  search: string
  filtro: string
  categoriaId: string
}

export function listaProductosDesdeRespuesta(data: unknown): Producto[] {
  if (Array.isArray(data)) return data as Producto[]
  if (data && typeof data === 'object' && 'content' in data) {
    const pagina = data as Pagina<Producto>
    return pagina.content ?? []
  }
  return []
}

export function listaCategoriasDesdeRespuesta(data: unknown): CategoriaAdmin[] {
  return Array.isArray(data) ? data as CategoriaAdmin[] : []
}

export function codigoProducto(producto: Producto) {
  const sku = producto.sku?.trim()
  if (sku) return sku
  const barcode = producto.barcode?.trim()
  if (barcode) return barcode
  return `P-${String(producto.id ?? '').padStart(4, '0')}`
}

export function textoStock(stock: number | string | null | undefined) {
  const n = Number(stock) || 0
  if (n <= 0) return '0'
  if (n <= STOCK_BAJO_MAX) return `${n} · quedan pocas`
  return String(n)
}

export function estaAgotado(producto: Producto) {
  return (Number(producto.stock) || 0) <= 0
}

export function filtrarSistemaProductos(products: Producto[], { search, filtro, categoriaId }: FiltrosSistemaProductos) {
  const q = search.trim().toLowerCase()
  return products.filter((p) => cumpleFiltroSistema(p, q, filtro, categoriaId))
}

function cumpleFiltroSistema(p: Producto, q: string, filtro: string, categoriaId: string) {
  if (q && !coincideBusqueda(p, q)) return false
  if (categoriaId && String(p.categoriaId) !== String(categoriaId)) return false
  if (filtro === 'activos' && estaAgotado(p)) return false
  if (filtro === 'agotados' && !estaAgotado(p)) return false
  return true
}

function coincideBusqueda(p: Producto, q: string) {
  const campos = [p.nombre, codigoProducto(p), p.sku, p.barcode]
  return campos.some((c) => String(c ?? '').toLowerCase().includes(q))
}

export function estiloChip(activo: boolean): CSSProperties {
  if (activo) {
    return {
      backgroundColor: 'rgba(23,71,168,0.08)',
      border: '1px solid var(--hc-accent)',
      color: 'var(--hc-accent)',
      fontWeight: 700,
    }
  }
  return {
    backgroundColor: 'var(--hc-surface)',
    border: '1px solid #d8cfc0',
    color: 'var(--hc-text)',
    fontWeight: 500,
  }
}

export function estiloEstado(agotado: boolean): CSSProperties {
  if (agotado) {
    return { backgroundColor: '#efe9df', color: '#6b6459' }
  }
  return { backgroundColor: '#e2f1e8', color: '#1E7F4F' }
}

export const FORM_VACIO: FormSistemaProducto = {
  nombre: '',
  descripcion: '',
  precioVenta: '',
  stock: '',
  categoriaId: '',
  sku: '',
  imagenUrl: '',
  bodegaId: '',
}
