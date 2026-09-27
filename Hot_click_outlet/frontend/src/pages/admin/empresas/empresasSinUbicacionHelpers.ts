import type { Id } from '@/types/api'

/** Fila de `GET /api/admin/empresas/sin-ubicacion` (negocios activos sin ubicación de despacho). */
export type EmpresaSinUbicacion = {
  id: Id
  nombreComercial?: string | null
  visibilidadPublica?: boolean
}

export const ETIQUETA_SIN_UBICACION = 'Sin ubicación'

export function listaSinUbicacionDesdeRespuesta(data: unknown): EmpresaSinUbicacion[] {
  if (Array.isArray(data)) return data as EmpresaSinUbicacion[]
  const interno = (data as { data?: unknown } | null)?.data
  return Array.isArray(interno) ? (interno as EmpresaSinUbicacion[]) : []
}

export function idsSinUbicacion(lista: readonly EmpresaSinUbicacion[]): Set<string> {
  return new Set(lista.map((empresa) => String(empresa.id)))
}

export function nombreEmpresaSinUbicacion(empresa: EmpresaSinUbicacion): string {
  return empresa.nombreComercial?.trim() || `Negocio #${empresa.id}`
}

export function tituloAvisoSinUbicacion(cantidad: number): string {
  return cantidad === 1
    ? '1 negocio activo no tiene ubicación de despacho'
    : `${cantidad} negocios activos no tienen ubicación de despacho`
}
