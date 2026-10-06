import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { useTenantPlanListo } from '@/app/useTenantPlanListo'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { prefijoPorPlan } from '@/utils/planPaths'
import { ROLES_POS, esStaffPlataforma, esUsuarioSistema } from '@/utils/sistemaUser'
import PlataformaShell from '@/pages/plataforma/PlataformaShell'

/** Solo el operador de HotClick entra. El vendedor vuelve a su plan y la caja a `/caja`. */
export default function PlataformaAcceso() {
  const { token, userRole } = useAuthStore()
  const { pathname, search } = useLocation()
  const { planNombre, esperando } = useTenantPlanListo()

  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${pathname}${search}`)} replace />
  }
  if (ROLES_POS.has(userRole ?? '') && !esUsuarioSistema(userRole)) {
    return <Navigate to="/caja" replace />
  }
  if (esUsuarioSistema(userRole)) {
    if (esperando) return <p className="p-6 text-sm text-hc-n-600">Cargando…</p>
    return <Navigate to={prefijoPorPlan(planNombre)} replace />
  }
  if (!esStaffPlataforma(userRole)) return <Navigate to="/" replace />

  return (
    <PlataformaShell>
      <Outlet />
    </PlataformaShell>
  )
}
