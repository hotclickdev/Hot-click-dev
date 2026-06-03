import useAuthStore from '@/store/authStore'

/**
 * Devuelve true si el usuario autenticado tiene el permiso granular indicado.
 * Uso: const puedeCobrar = usePermission('pos.usar')
 */
export function usePermission(perm) {
  return useAuthStore(s => s.permissions.includes(perm))
}

/**
 * Devuelve true si el usuario tiene al menos uno de los roles indicados.
 * Uso: const esAdmin = useHasAnyRole('ADMIN_IT', 'GERENTE')
 */
export function useHasAnyRole(...roles) {
  return useAuthStore(s => roles.some(r => s.roles.includes(r)))
}
