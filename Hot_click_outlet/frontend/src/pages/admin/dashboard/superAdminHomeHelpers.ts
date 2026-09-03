import type { TonoBadge } from '@/prototipo/admin/adminData'
import {
  etiquetaEstadoTienda,
  empresasOperables,
  tonoEstadoTiendaLista,
  type EmpresaLista,
} from '../empresas/empresasHelpers'
import { getRolStr, type UsuarioAdmin } from '../usuarios/usuarioHelpers'
import type { DashboardStats } from './dashboardHelpers'

export type KpisPanelAdmin = {
  tiendasActivas: number
  vendedores: number
  productos: number
  ventas: number
}

export { etiquetaEstadoTienda }

const ROLES_VENDEDOR = new Set(['EMPRENDEDOR', 'CAJERO', 'GERENTE', 'SUPERVISOR'])

export function kpisPanelAdmin(
  empresas: EmpresaLista[],
  stats: DashboardStats,
  users: UsuarioAdmin[],
): KpisPanelAdmin {
  const operables = empresasOperables(empresas)
  const vendedores = users.filter((u) => ROLES_VENDEDOR.has(getRolStr(u))).length
  return {
    tiendasActivas: operables.filter((e) => e.estadoEmpresa === 'ACTIVO').length,
    vendedores: vendedores || stats.totalUsuarios || 0,
    productos: stats.totalProductos ?? 0,
    ventas: stats.totalVentas ?? 0,
  }
}

export function tonoEstadoTienda(estado?: string): TonoBadge {
  return tonoEstadoTiendaLista(estado)
}
