const ROLES_CAJA = new Set(['ADMIN', 'EMPRENDEDOR', 'CAJERO', 'GERENTE', 'SUPERVISOR'])
const ALL_ADMIN_ROLES = new Set(['ADMIN', 'EMPRENDEDOR', 'GERENTE', 'SUPERVISOR'])
const STORE_ROLES = new Set(['ADMIN', 'EMPRENDEDOR'])

export type ModoApp = {
  id: string
  label: string
  sub: string
  path: string
  icon: string
}

/**
 * Misma regla que el backend del POS: rol de caja o permiso pos.usar.
 */
export function puedeUsarCaja(rol: string, permissions: string[] = []) {
  return ROLES_CAJA.has(rol) || permissions.includes('pos.usar')
}

/**
 * Modos de entrada. Sistema (dueño) no se etiqueta como Admin IT.
 */
export function getAvailableModes(rol: string, permissions: string[] = [], opts: { empresaSlug?: string | null } = {}) {
  const empresaSlug = opts.empresaSlug
  const isAdmin = ALL_ADMIN_ROLES.has(rol)
  const isCajero = rol === 'CAJERO'
  const esSistema = rol === 'EMPRENDEDOR'

  const modes: ModoApp[] = []

  if (isAdmin && !isCajero) {
    modes.push({
      id: 'admin',
      label: esSistema ? 'Sistema' : 'Panel de administración',
      sub: esSistema ? 'Productos, pedidos y tu plan' : 'Gestiona productos, pedidos y reportes',
      path: '/admin',
      icon: 'admin',
    })
  }

  if (puedeUsarCaja(rol, permissions)) {
    modes.push({
      id: 'pos',
      label: 'Caja registradora (POS)',
      sub: 'Registra ventas en punto de venta',
      path: '/admin/pos',
      icon: 'pos',
    })
  }

  if (rol === 'ADMIN') {
    modes.push({
      id: 'security',
      label: 'Seguridad',
      sub: 'Centro de seguridad y auditoría',
      path: '/admin/security',
      icon: 'security',
    })
  }

  if (STORE_ROLES.has(rol) && rol !== 'ADMIN') {
    modes.push({
      id: 'store',
      label: 'Ver mi tienda',
      sub: 'Así te ven los compradores',
      path: empresaSlug ? `/tienda/${empresaSlug}` : '/',
      icon: 'store',
    })
  }

  if (modes.length === 0) {
    modes.push({ id: 'store', label: 'Ir a la tienda', sub: '', path: '/', icon: 'store' })
  }

  return modes
}

export const MODE_PREF_KEY = 'hotclick-mode-pref'
