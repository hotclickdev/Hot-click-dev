import type { Id } from '@/types/api'

/** Límite de fotos para roles estándar. */
export const LIMIT_DEFAULT = 100

/** Límite de fotos para ADMIN y SUPER_ADMIN. */
export const LIMIT_EXTENDED = 1500

/** Roles que pueden cargar más de LIMIT_DEFAULT fotos. */
export const EXTENDED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

/** Máximo de fotos extra por producto (además de la principal). */
export const MAX_EXTRA = 9

/** Tamaño máximo por imagen en bytes (10 MB). */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

export type ProductoDraft = {
  id: string
  mainFile: File
  mainPreview: string
  extraFiles: File[]
  extraPreviews: string[]
  nombre: string
  categoriaId: string
  precioVenta: string
  precioCompra: string
  stock: string
}

export type CategoriaCarga = {
  id: Id
  nombreCategoria?: string
}

export type CargaProgress = { done: number; total: number }

/**
 * Crea un borrador de producto a partir de un archivo de imagen.
 */
export function createDraft(file: File): ProductoDraft {
  return {
    id: globalThis.crypto.randomUUID(),
    mainFile: file,
    mainPreview: URL.createObjectURL(file),
    extraFiles: [],
    extraPreviews: [],
    nombre: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim(),
    categoriaId: '',
    precioVenta: '',
    precioCompra: '',
    stock: '1',
  }
}

export function categoriasDesdeRespuesta(data: unknown): CategoriaCarga[] {
  if (Array.isArray(data)) return data as CategoriaCarga[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: unknown }).data
    return Array.isArray(inner) ? inner as CategoriaCarga[] : []
  }
  return []
}

export function urlDesdeUpload(data: unknown): string {
  const d = data as { data?: { url?: string }; url?: string } | null | undefined
  return d?.data?.url ?? d?.url ?? ''
}

export function idDesdeProductoCreado(data: unknown): Id | undefined {
  const d = data as { data?: { id?: Id }; id?: Id } | null | undefined
  return d?.data?.id ?? d?.id
}

export function mensajeErrorCarga(err: unknown): string {
  if (err && typeof err === 'object') {
    const ax = err as { response?: { data?: { message?: unknown } }; message?: unknown }
    if (typeof ax.response?.data?.message === 'string') return ax.response.data.message
    if (typeof ax.message === 'string') return ax.message
  }
  return 'Error'
}
