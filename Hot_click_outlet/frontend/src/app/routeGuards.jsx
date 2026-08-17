import { lazy } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import POSShell from '@/layouts/POSShell'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const SistemaInicio  = lazy(() => import('@/pages/admin/SistemaInicio'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const SistemaVentasPedidos = lazy(() => import('@/pages/admin/SistemaVentasPedidos'))
const AdminReportes       = lazy(() => import('@/pages/admin/AdminReportes'))
const SistemaReportes     = lazy(() => import('@/pages/admin/SistemaReportes'))
const AdminOfertas              = lazy(() => import('@/pages/admin/AdminOfertas'))
const SistemaPromociones        = lazy(() => import('@/pages/admin/SistemaPromociones'))

/**
 * True si el JWT existe y `exp` todavía no pasó.
 * @param {string|null|undefined} token
 */
function isTokenAlive(token) {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

/**
 * Exige sesión viva; si no, redirige a `/login`.
 */
export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return isTokenAlive(token) ? children : <Navigate to="/login" replace />
}

/**
 * Exige rol admin. Con `itOnly`, además exige `ADMIN` (no EMPRENDEDOR).
 */
export function AdminRoute({ children, itOnly = false }) {
  const { token, userRole } = useAuthStore()
  if (!isTokenAlive(token)) return <Navigate to="/login" replace />
  const isAdmin = ADMIN_ROLES.has(userRole)
  if (!isAdmin) return <Navigate to="/" replace />
  if (itOnly && userRole !== 'ADMIN') return <Navigate to="/admin" replace />
  return children
}

/**
 * Outlet solo para `ADMIN` de plataforma; el resto vuelve a `/admin`.
 */
export function ITOnlyGuard() {
  const userRole = useAuthStore((s) => s.userRole)
  if (userRole !== 'ADMIN') return <Navigate to="/admin" replace />
  return <Outlet />
}

// El dueño de negocio (EMPRENDEDOR) ve el Inicio simplificado del "Sistema";
// el resto de roles admin sigue con el dashboard actual sin cambios.
/** Inicio admin: Sistema para EMPRENDEDOR, dashboard para el resto. */
export function AdminHomeRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return userRole === 'EMPRENDEDOR' ? <SistemaInicio /> : <AdminDashboard />
}

// Mismo criterio: EMPRENDEDOR ve "Ventas y pedidos" con tabs (mockup Sistema
// - Ventas.dc.html); el resto de roles admin sigue con AdminOrders sin cambios.
/** Pedidos admin: Sistema para EMPRENDEDOR, AdminOrders para el resto. */
export function AdminPedidosRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return userRole === 'EMPRENDEDOR' ? <SistemaVentasPedidos /> : <AdminOrders />
}

// Mismo criterio: EMPRENDEDOR ve "Reportes" con la estructura Finanzas /
// Análisis y recomendaciones / Alertas de productos (mockup Sistema -
// Reportes.dc.html); el resto de roles admin sigue con AdminReportes sin cambios.
/** Reportes admin: Sistema para EMPRENDEDOR, AdminReportes para el resto. */
export function AdminReportesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return userRole === 'EMPRENDEDOR' ? <SistemaReportes /> : <AdminReportes />
}

// Mismo criterio: EMPRENDEDOR ve "Promociones" con solicitud de aprobación
// + estado de sus solicitudes; el resto de roles admin sigue con AdminOfertas
// (que aplica la promo al instante) sin cambios.
/** Promociones admin: Sistema para EMPRENDEDOR, AdminOfertas para el resto. */
export function AdminPromocionesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return userRole === 'EMPRENDEDOR' ? <SistemaPromociones /> : <AdminOfertas />
}

/** Roles de caja/POS que entran al shell sin ser ADMIN_ROLES. */
const POS_ROLES = new Set(['CAJERO', 'GERENTE', 'SUPERVISOR'])

/**
 * Shell de `/admin/*`: POSShell en `/admin/pos`, AdminLayout en el resto.
 * Mismos Navigate que el App original (login / home).
 */
export function AdminShell() {
  const { token, userRole } = useAuthStore()
  const { pathname } = useLocation()
  if (!isTokenAlive(token)) return <Navigate to="/login" replace />
  const isAdmin = ADMIN_ROLES.has(userRole)
  const isPOS   = POS_ROLES.has(userRole)
  if (!isAdmin && !isPOS) return <Navigate to="/" replace />

  // La Caja/POS es una experiencia aparte del panel de Sistema: nunca se
  // muestra dentro del sidebar/chrome de AdminLayout (ver ModeSelector).
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
