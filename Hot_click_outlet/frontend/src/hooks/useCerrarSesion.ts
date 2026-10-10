import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { authService } from '@/services/authService'

/**
 * Cierra la sesión completa: revoca la cookie de refresh en el servidor
 * (si no, el panel vuelve a abrir solo con el refresh) y lleva al inicio público.
 */
export function useCerrarSesion(destino = '/') {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return useCallback(() => {
    authService.logout().catch(() => { /* la sesión local se cierra igual */ })
    logout()
    navigate(destino, { replace: true })
  }, [logout, navigate, destino])
}
