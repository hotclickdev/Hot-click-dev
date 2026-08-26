import { lazy } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import POSShell from '@/layouts/POSShell'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const SistemaInicio  = lazy(() => import('@/pages/admin/SistemaInicio'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const SistemaVentasPedidos = lazy(() => import('@/pages/admin/SistemaVentasPedidos'))
const AdminReportes       = lazy(() => import('@/pages/admin/AdminReportes'))
const SistemaReportes     = lazy(() => import('@/pages/admin/SistemaReportes'))
const AdminOfertas              = lazy(() => import('@/pages/admin/AdminOfertas'))
const SistemaPromociones        = lazy(() => import('@/pages/admin/SistemaPromociones'))
const AdminProducts             = lazy(() => import('@/pages/admin/AdminProducts'))
const SistemaProductos          = lazy(() => import('@/pages/admin/SistemaProductos'))
const SistemaProductoForm       = lazy(() => import('@/pages/admin/sistema-productos/SistemaProductoForm'))
const AdminClientes             = lazy(() => import('@/pages/admin/AdminClientes'))
const SistemaClientes           = lazy(() => import('@/pages/admin/SistemaClientes'))
const AdminBlog                 = lazy(() => import('@/pages/admin/AdminBlog'))
const SistemaPosts              = lazy(() => import('@/pages/admin/SistemaPosts'))
const AdminCopilot              = lazy(() => import('@/pages/admin/AdminCopilot'))
const SistemaCopilot            = lazy(() => import('@/pages/admin/SistemaCopilot'))

/**
 * Exige sesión viva; si no, redirige a `/login` con retorno a esta ruta.
 */
export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (isTokenAlive(token)) return children
  const from = `${location.pathname}${location.search}`
  return <Navigate to={rutaLoginConRetorno(from)} replace state={{ from }} />
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

/** Inicio: Sistema para el dueño (cualquier plan), dashboard para el resto. */
export function AdminHomeRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaInicio /> : <AdminDashboard />
}

/** Pedidos: Sistema para el dueño, AdminOrders para el resto. */
export function AdminPedidosRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaVentasPedidos /> : <AdminOrders />
}

/** Reportes: Sistema para el dueño, AdminReportes para el resto. */
export function AdminReportesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaReportes /> : <AdminReportes />
}

/** Promociones: Sistema para el dueño, AdminOfertas para el resto. */
export function AdminPromocionesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaPromociones /> : <AdminOfertas />
}

/** Productos: Sistema para el dueño (EMPRENDEDOR/PYME/NEGOCIO_PLUS), admin IT para el resto. */
export function AdminProductosRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaProductos /> : <AdminProducts />
}

/** Alta/edición Sistema. El admin IT sigue usando el modal de AdminProducts. */
export function SistemaProductoFormRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  if (!esUsuarioSistema(userRole)) return <Navigate to="/admin/productos" replace />
  return <SistemaProductoForm />
}

/** Clientes: tarjetas Sistema para el dueño. */
export function AdminClientesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaClientes /> : <AdminClientes />
}

/** Posts: mockup Sistema para el dueño. */
export function AdminBlogRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaPosts /> : <AdminBlog />
}

/** Consultas con Hot: mockup Sistema para el dueño. */
export function AdminCopilotRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaCopilot /> : <AdminCopilot />
}

/**
 * Si el dueño pega una URL de admin IT, lo manda al equivalente Sistema.
 * @param {{ to: string, children: import('react').ReactNode }} props
 */
export function RedirectSiSistema({ to, children }) {
  const userRole = useAuthStore((s) => s.userRole)
  if (esUsuarioSistema(userRole)) return <Navigate to={to} replace />
  return children
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
