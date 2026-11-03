import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { cerrarSesionCompleta } from '@/services/cerrarSesion'

/**
 * Cierra la sesión completa: revoca la cookie de refresh en el servidor
 * (si no, el panel vuelve a abrir solo con el refresh) y lleva al inicio público.
 */
export function useCerrarSesion(destino = '/') {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return useCallback(() => {
    // Token capturado antes de limpiar: el POST sale con Bearer y se espera antes del logout local.
    void cerrarSesionCompleta({
      token: useAuthStore.getState().token,
      cerrarLocal: logout,
      navegar: (d) => navigate(d, { replace: true }),
      destino,
    })
  }, [logout, navigate, destino])
}
