import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { destinoVender, RUTA_REGISTRO_EMPRESA, RUTA_REGISTRAR_NEGOCIO } from '@/utils/destinoVender'

/**
 * Comprador con sesión: el alta es la de `/registro-empresa` (A1 → A2), sin campos de cuenta.
 * Quien ya tiene negocio sigue yendo a su panel.
 */
export default function RegistrarNegocioPage() {
  const userRole = useAuthStore((s) => s.userRole)
  const empresaId = useAuthStore((s) => s.empresaId)
  const destino = destinoVender({ tokenVivo: true, rol: userRole, empresaId })
  if (destino !== RUTA_REGISTRAR_NEGOCIO) return <Navigate to={destino} replace />
  return <Navigate to={RUTA_REGISTRO_EMPRESA} replace />
}
