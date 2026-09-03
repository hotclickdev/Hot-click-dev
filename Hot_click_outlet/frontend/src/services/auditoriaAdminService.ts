import api from './api'
import type { ResponseDTO } from '@/types/api'

export type AuditoriaAdminEvento = {
  id: number
  adminId?: number | null
  adminEmail?: string | null
  accion: string
  entidad: string
  entidadId?: number | null
  detalle?: string | null
  fecha: string
  empresaId?: number | null
  empresaNombre?: string | null
}

export type AuditoriaAdminPagina = {
  content: AuditoriaAdminEvento[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  diasRetencion?: number
  desdeEfectivo?: string
  hastaEfectivo?: string
}

export type AuditoriaAdminFiltros = {
  accion?: string
  adminEmail?: string
  empresaId?: number
  desde?: string
  hasta?: string
  page?: number
  size?: number
}

function paramsDe(filtros: AuditoriaAdminFiltros): Record<string, string | number> {
  const p: Record<string, string | number> = {
    page: filtros.page ?? 0,
    size: filtros.size ?? 20,
  }
  if (filtros.accion) p.accion = filtros.accion
  if (filtros.adminEmail) p.adminEmail = filtros.adminEmail
  if (filtros.empresaId != null) p.empresaId = filtros.empresaId
  if (filtros.desde) p.desde = filtros.desde
  if (filtros.hasta) p.hasta = filtros.hasta
  return p
}

/** Listado de auditoría admin (solo lectura). */
export const auditoriaAdminService = {
  listar: (filtros: AuditoriaAdminFiltros = {}) =>
    api.get<ResponseDTO>('/admin/auditorias', { params: paramsDe(filtros) }),
  tipos: () => api.get<ResponseDTO>('/admin/auditorias/tipos'),
}
