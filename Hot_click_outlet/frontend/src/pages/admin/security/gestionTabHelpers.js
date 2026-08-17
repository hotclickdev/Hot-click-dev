export const ROLES_ADMIN = [
  { value: 'USUARIO_FINAL', label: 'Cliente'     },
  { value: 'EMPRENDEDOR',   label: 'Emprendedor' },
  { value: 'ADMIN',         label: 'Admin'       },
  { value: 'CAJERO',        label: 'Cajero'      },
  { value: 'GERENTE',       label: 'Gerente'     },
]

export const ESTADO_NUM = { 1: 'ACTIVO', 2: 'INACTIVO', 3: 'ELIMINADO', 4: 'SUSPENDIDO', 5: 'PENDIENTE' }
export const ESTADO_INT = { ACTIVO: 1, INACTIVO: 2 }

export const ROL_BADGE = {
  ADMIN:         { label: 'Admin',        bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  EMPRENDEDOR:   { label: 'Emprendedor',  bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24' },
  CAJERO:        { label: 'Cajero',       bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  GERENTE:       { label: 'Gerente',      bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa' },
  USUARIO_FINAL: { label: 'Cliente',      bg: 'rgba(142,142,154,0.12)', text: '#a1a1aa' },
}

export const ESTADO_BADGE = {
  ACTIVO:     { text: '#4ade80', bg: 'rgba(34,197,94,0.12)'  },
  SUSPENDIDO: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  PENDIENTE:  { text: '#facc15', bg: 'rgba(234,179,8,0.12)'  },
  INACTIVO:   { text: '#a1a1aa', bg: 'rgba(142,142,154,0.12)'},
  ELIMINADO:  { text: '#f87171', bg: 'rgba(239,68,68,0.12)'  },
}

export const ROLES_CON_NEGOCIO = new Set(['EMPRENDEDOR'])

/** @param {object} u */
export function getRol(u) { return u.roles?.[0]?.nombreRol ?? 'USUARIO_FINAL' }

/** @param {object} u */
export function getEstado(u) { return ESTADO_NUM[u.estado] ?? 'INACTIVO' }
