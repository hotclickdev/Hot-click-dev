/**
 * Devuelve los modos de acceso disponibles para el usuario autenticado.
 * Cada modo tiene: id, label, sub, path, icon.
 *
 * Reglas:
 *   - CAJERO                      → solo POS
 *   - USUARIO_FINAL               → solo tienda
 *   - ADMIN_IT/ADMIN_CLIENTE/EMPRENDEDOR → Admin + Tienda (+ POS si tiene permiso)
 *   - GERENTE/SUPERVISOR          → Admin + POS
 */
export function getAvailableModes(rol, permissions = []) {
  const hasPos   = permissions.includes('pos.usar') ||
                   ['CAJERO','GERENTE','SUPERVISOR'].includes(rol)
  const isAdmin  = ['ADMIN_IT','ADMIN_CLIENTE','EMPRENDEDOR','GERENTE','SUPERVISOR'].includes(rol)
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

  if (['ADMIN_IT','ADMIN_CLIENTE','EMPRENDEDOR'].includes(rol)) {
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
