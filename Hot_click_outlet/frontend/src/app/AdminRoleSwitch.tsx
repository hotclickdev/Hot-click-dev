import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import POSShell from '@/layouts/POSShell'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'

const POS_ROLES = new Set(['CAJERO', 'GERENTE', 'SUPERVISOR'])

/**
 * /admin/*: AdminLayout + Outlet (CRUD real). El prototipo Figma vive en `/prototipo`.
 */
export default function AdminRoleSwitch() {
  const { token, userRole } = useAuthStore()
  const { pathname, search } = useLocation()

  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${pathname}${search}`)} replace />
  }
  const rol = userRole ?? ''
  const isAdmin = ADMIN_ROLES.has(rol)
  const isPOS = POS_ROLES.has(rol)
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

  return (
    <AdminErrorBoundary>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminErrorBoundary>
  )
}
