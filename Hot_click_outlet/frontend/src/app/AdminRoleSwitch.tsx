import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import POSShell from '@/layouts/POSShell'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { ROLES_POS, esUsuarioSistema } from '@/utils/sistemaUser'
import { adminAVendedor, vendedorSeQuedaEnAdmin } from '@/app/rolPaths'
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
 * `/admin/*`: Super Admin (IT) en AdminLayout. El vendedor va al prefijo Figma de su plan;
 * solo POS permanece en `/admin/pos` (POSShell).
 */
export default function AdminRoleSwitch() {
  const { token, userRole } = useAuthStore()
  const { pathname, search } = useLocation()
  const { planNombre, esperando } = useTenantPlanListo()

  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${pathname}${search}`)} replace />
  }
  const rol = userRole ?? ''
  const isAdmin = ADMIN_ROLES.has(rol)
  const isPOS = ROLES_POS.has(rol)
  if (!isAdmin && !isPOS) return <Navigate to="/" replace />

  if (pathname.startsWith('/admin/pos')) {
    return (
      <AdminErrorBoundary>
        <POSShell>
          <Outlet />
        </POSShell>
      </AdminErrorBoundary>
    )
  }

  if (esUsuarioSistema(rol) && !vendedorSeQuedaEnAdmin(pathname)) {
    if (esperando) return <SpinnerRuta />
    const dest = adminAVendedor(pathname, search, planNombre)
    if (dest) return <Navigate to={dest} replace />
  }

  return (
    <AdminErrorBoundary>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminErrorBoundary>
  )
}
