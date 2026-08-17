export const ESTADO_NUM = {
  1: 'ACTIVO',
  2: 'INACTIVO',
  3: 'ELIMINADO',
  4: 'SUSPENDIDO',
  5: 'PENDIENTE',
}

export const ESTADO_INT = { ACTIVO: 1, INACTIVO: 2 }

export const ROLES = [
  { value: 'USUARIO_FINAL', label: 'Cliente' },
  { value: 'EMPRENDEDOR', label: 'Emprendedor' },
  { value: 'ADMIN', label: 'Admin' },
]

export const ROLE_COLORS = {
  ADMIN: 'danger',
  EMPRENDEDOR: 'purple',
  USUARIO_FINAL: 'default',
}

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  EMPRENDEDOR: 'Emprendedor',
  USUARIO_FINAL: 'Cliente',
}

export const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS']

export const PLAN_LABELS = {
  EMPRENDEDOR: 'Emprendedor',
  PYME: 'Pyme',
  NEGOCIO_PLUS: 'Negocio Plus',
}

export const PLAN_COLORS = {
  EMPRENDEDOR: 'default',
  PYME: 'accent',
  NEGOCIO_PLUS: 'warning',
}

export const ESTADO_BADGE = {
  ACTIVO: 'success',
  PENDIENTE: 'warning',
  INACTIVO: 'default',
  SUSPENDIDO: 'danger',
  ELIMINADO: 'danger',
}

/** @param {{ estado?: number }} u */
export function getEstadoStr(u) {
  return ESTADO_NUM[u.estado] ?? 'INACTIVO'
}

/** @param {{ roles?: { nombreRol?: string }[] }} u */
export function getRolStr(u) {
  return u.roles?.[0]?.nombreRol ?? 'USUARIO_FINAL'
}

/** @param {unknown} data */
export function listaUsuariosDesdeRespuesta(data) {
  return Array.isArray(data) ? data : data.content ?? []
}

/** @param {unknown} empresas */
export function empresasPlanDesdeRespuesta(empresas) {
  const empresasList = Array.isArray(empresas) ? empresas : (empresas?.data ?? empresas?.content ?? [])
  return Object.fromEntries(empresasList.map((e) => [e.id, e.plan]))
}

/**
 * @param {unknown} all
 * @param {unknown} pend
 * @param {unknown} empresas
 */
export function usuariosDesdeRespuestas(all, pend, empresas) {
  return {
    users: listaUsuariosDesdeRespuesta(all),
    pending: listaUsuariosDesdeRespuesta(pend),
    empresasPlan: empresasPlanDesdeRespuesta(empresas),
  }
}
