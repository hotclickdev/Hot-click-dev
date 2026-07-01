const POS_ROLES       = new Set(['CAJERO','GERENTE','SUPERVISOR'])
const ALL_ADMIN_ROLES = new Set(['ADMIN','EMPRENDEDOR','GERENTE','SUPERVISOR'])
const STORE_ROLES     = new Set(['ADMIN','EMPRENDEDOR'])

export function getAvailableModes(rol, permissions = []) {
  const hasPos   = permissions.includes('pos.usar') || POS_ROLES.has(rol)
  const isAdmin  = ALL_ADMIN_ROLES.has(rol)
  const isCajero = rol === 'CAJERO'

  const modes = []

  if (isAdmin && !isCajero) {
    modes.push({
      id:    'admin',
      label: 'Panel de administración',
      sub:   'Gestiona productos, pedidos y reportes',
      path:  '/admin',
      icon:  'admin',
    })
  }

  if (hasPos) {
    modes.push({
      id:    'pos',
      label: 'Caja registradora (POS)',
      sub:   'Registra ventas en punto de venta',
      path:  '/admin/pos',
      icon:  'pos',
    })
  }

  if (STORE_ROLES.has(rol)) {
    modes.push({
      id:    'store',
      label: 'Ver la tienda',
      sub:   'Navega el ecommerce como cliente',
      path:  '/',
      icon:  'store',
    })
  }

  if (modes.length === 0) {
    modes.push({ id: 'store', label: 'Ir a la tienda', sub: '', path: '/', icon: 'store' })
  }

  return modes
}

export const MODE_PREF_KEY = 'hotclick-mode-pref'
