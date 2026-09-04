import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import useAuthStore from '@/store/authStore'
import { ROLES_POS, esUsuarioSistema, esStaffPlataforma } from '@/utils/sistemaUser'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import {
  prefijoVendedor,
  rutaConBase,
  segmentoTrasPrefijo,
} from '@/app/rolPaths'
import { useTenantPlanListo } from '@/app/useTenantPlanListo'

function SpinnerRuta() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hc-bg">
      <div
        className="size-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
      />
    </div>
  )
}

/**
 * El prefijo de URL debe coincidir con el plan. Un PYME no se queda en `/emprendedor`.
 */
export default function PlanPathGate({
  prefijo,
  children,
}: {
  prefijo: string
  children: ReactNode
}) {
  const token = useAuthStore((s) => s.token)
  const userRole = useAuthStore((s) => s.userRole)
  const { pathname, search } = useLocation()
  const { planNombre, esperando } = useTenantPlanListo()

  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${pathname}${search}`)} replace />
  }
  if (esStaffPlataforma(userRole)) return <Navigate to="/admin" replace />
  if (ROLES_POS.has(userRole ?? '') && !esUsuarioSistema(userRole)) {
    return <Navigate to="/admin/pos" replace />
  }
  if (!esUsuarioSistema(userRole)) return <Navigate to="/" replace />
  if (esperando) return <SpinnerRuta />

  const correcto = prefijoVendedor(planNombre)
  if (correcto !== prefijo) {
    const resto = segmentoTrasPrefijo(pathname, prefijo)
    return <Navigate to={`${rutaConBase(correcto, resto)}${search}`} replace />
  }
  return children
}
