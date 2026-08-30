import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

export type CatalogViewMode = 'all' | 'ofertas' | 'emprendimientos'

export type CatalogCategoria = {
  id?: Id
  padreId?: unknown
  parentId?: unknown
  categoriaPadre?: { id?: unknown }
  nombreCategoria?: string
  nombre?: string
  icono?: string
}

export type CatalogCategoriaNodo = CatalogCategoria & {
  children: CatalogCategoria[]
}

export type CatalogMarca = {
  id?: Id
  nombreMarca?: string
  logoUrl?: string | null
}

export type CatalogConvenio = {
  id?: Id
  nombre?: string
  logoUrl?: string | null
}

export type CatalogCounts = Record<string, number>

export type CatalogChildItem = {
  childId: Id | undefined
  childName: string
  product: Producto
  count: number
}

export type CatalogParentRow = {
  type: 'parent'
  catId: Id | undefined
  catName: string
  childItems: CatalogChildItem[]
  totalCount: number
}

export type CatalogLeafRow = {
  type: 'leaf'
  catId: Id | string | undefined
  catName: string
  products: Producto[]
  totalCount: number
}

export type CatalogEmpRow = {
  type: 'emprendimientos'
}

export type CatalogRow = CatalogParentRow | CatalogLeafRow | CatalogEmpRow
