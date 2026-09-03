import type { MiembroEquipo } from '@/pages/admin/equipo/equipoHelpers'

export function nombreVisibleMiembro(m: Pick<MiembroEquipo, 'nombre' | 'correo'>): string {
  const nombre = m.nombre?.trim()
  if (nombre) return nombre
  const correo = m.correo?.trim()
  if (correo) return correo
  return 'Miembro'
}

export function puedeQuitarMiembro(m: Pick<MiembroEquipo, 'rolEnEmpresa'>): boolean {
  return m.rolEnEmpresa !== 'PROPIETARIO'
}

export function esMiembroVisibleEnLista(m: Pick<MiembroEquipo, 'estado'>): boolean {
  return m.estado === 1 || m.estado === 5
}
