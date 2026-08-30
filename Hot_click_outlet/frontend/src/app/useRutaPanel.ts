import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { rutaPanelPorRol } from '@/utils/planPaths'

/** Panel del usuario: `/admin` (plataforma) o prefijo Figma del plan. */
export default function useRutaPanel() {
  const rol = useAuthStore((s) => s.userRole)
  const planNombre = useTenantStore((s) => s.planNombre)
  return rutaPanelPorRol(rol, planNombre)
}
