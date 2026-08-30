import type { Id } from '@/types/api'

export type MarcaAdmin = {
  id: Id
  nombreMarca: string
  logoUrl?: string
}

export type FormularioMarca = {
  nombreMarca: string
  logoUrl: string
}

export type DeleteTargetMarca = { id: Id; nombre: string }

export const FORMULARIO_MARCA_VACIO: FormularioMarca = { nombreMarca: '', logoUrl: '' }

export const COLUMNAS_EXPORT_MARCAS = ['id', 'nombreMarca', 'logoUrl']
export const COLUMNAS_IMPORT_MARCAS = ['nombreMarca', 'logoUrl']
export const NOMBRE_ARCHIVO_MARCAS = 'marcas'
export const NOMBRE_HOJA_MARCAS = 'Marcas'

export function listaMarcasDesdeRespuesta(data: unknown): MarcaAdmin[] {
  return Array.isArray(data) ? data as MarcaAdmin[] : []
}

export function formularioDesdeMarca(marca: Pick<MarcaAdmin, 'nombreMarca' | 'logoUrl'>): FormularioMarca {
  return {
    nombreMarca: marca.nombreMarca ?? '',
    logoUrl: marca.logoUrl ?? '',
  }
}

export function nombreMarcaEsValido(nombre?: string): boolean {
  return Boolean(nombre?.trim())
}

export function urlLogoDesdeRespuesta(respuesta: { data?: { url?: string } | string }): string {
  return (respuesta.data as { url?: string })?.url ?? (respuesta.data as string)
}

export function filasExportacionMarcas(marcas: MarcaAdmin[]): { id: Id; nombreMarca: string; logoUrl: string }[] {
  return marcas.map((marca) => ({
    id: marca.id,
    nombreMarca: marca.nombreMarca,
    logoUrl: marca.logoUrl ?? '',
  }))
}

export function filaImportacionMarca(fila: { nombreMarca?: unknown; logoUrl?: unknown }): { nombreMarca: unknown; logoUrl: unknown } {
  return {
    nombreMarca: fila.nombreMarca ?? '',
    logoUrl: fila.logoUrl ?? '',
  }
}

export function inicialDeMarca(nombre?: string): string {
  return (nombre ?? '').charAt(0).toUpperCase()
}

export function etiquetaConteoMarcas(cantidad: number): string {
  const plural = cantidad === 1 ? '' : 's'
  return `${cantidad} marca${plural} registrada${plural}`
}

export function mensajeErrorMarca(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
