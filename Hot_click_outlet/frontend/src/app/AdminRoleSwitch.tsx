import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { ROLES_POS, esUsuarioSistema, esStaffPlataforma } from '@/utils/sistemaUser'
import { adminAVendedor, vendedorSeQuedaEnAdmin } from '@/app/rolPaths'
import { useTenantPlanListo } from '@/app/useTenantPlanListo'
import { esRutaTenantOpsParaAdmin } from '@/layouts/admin/adminItJobs'

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
 * `/admin/*`: Super Admin (plataforma) en AdminLayout.
 * El vendedor va al prefijo de su plan. La caja vive en ese prefijo o en `/caja`.
 * ADMIN no opera rutas de tienda.
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
  if (!isAdmin && !ROLES_POS.has(rol)) return <Navigate to="/" replace />

  if (ROLES_POS.has(rol) && !esUsuarioSistema(rol) && pathname.startsWith('/admin')) {
    const sub = pathname.startsWith('/admin/pos') ? pathname.slice('/admin/pos'.length) : ''
    return <Navigate to={`/caja${sub}${search}`} replace />
  }

  // Operador de plataforma: fuera de ops de negocio.
  // No usar `isAdmin`/`ADMIN_ROLES` — incluye vendedores y rompería el remap a seller.
  if (esStaffPlataforma(rol) && esRutaTenantOpsParaAdmin(pathname)) {
    return <Navigate to="/admin" replace />
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
