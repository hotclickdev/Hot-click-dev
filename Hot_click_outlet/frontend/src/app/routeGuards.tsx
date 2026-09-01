import { lazy, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import { rutaNuevoProductoSeller } from '@/prototipo/compartido/rutaNuevoProductoSeller'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const SistemaInicio = lazy(() => import('@/pages/admin/SistemaInicio'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const SistemaVentasPedidos = lazy(() => import('@/pages/admin/SistemaVentasPedidos'))
const AdminReportes = lazy(() => import('@/pages/admin/AdminReportes'))
const SistemaReportes = lazy(() => import('@/pages/admin/SistemaReportes'))
const AdminOfertas = lazy(() => import('@/pages/admin/AdminOfertas'))
const SistemaPromociones = lazy(() => import('@/pages/admin/SistemaPromociones'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const SistemaProductos = lazy(() => import('@/pages/admin/SistemaProductos'))
const SistemaProductoForm = lazy(() => import('@/pages/admin/sistema-productos/SistemaProductoForm'))
const AdminClientes = lazy(() => import('@/pages/admin/AdminClientes'))
const SistemaClientes = lazy(() => import('@/pages/admin/SistemaClientes'))
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog'))
const SistemaPosts = lazy(() => import('@/pages/admin/SistemaPosts'))
const AdminCopilot = lazy(() => import('@/pages/admin/AdminCopilot'))
const SistemaCopilot = lazy(() => import('@/pages/admin/SistemaCopilot'))

type ConHijos = { children: ReactNode }

/**
 * Exige sesión viva; si no, redirige a `/login` con retorno a esta ruta.
 */
export function ProtectedRoute({ children }: ConHijos) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (isTokenAlive(token)) return children
  const from = `${location.pathname}${location.search}`
  return <Navigate to={rutaLoginConRetorno(from)} replace state={{ from }} />
}

/**
 * Exige rol admin. Con `itOnly`, además exige `ADMIN` (no EMPRENDEDOR).
 */
export function AdminRoute({ children, itOnly = false }: ConHijos & { itOnly?: boolean }) {
  const { token, userRole } = useAuthStore()
  const location = useLocation()
  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${location.pathname}${location.search}`)} replace />
  }
  const isAdmin = ADMIN_ROLES.has(userRole ?? '')
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

/** Inicio: dashboard IT, Sistema para el dueño. */
export function AdminHomeRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaInicio /> : <AdminDashboard />
}

export function AdminPedidosRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaVentasPedidos /> : <AdminOrders />
}

export function AdminReportesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaReportes /> : <AdminReportes />
}

export function AdminPromocionesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaPromociones /> : <AdminOfertas />
}

export function AdminProductosRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaProductos /> : <AdminProducts />
}

export function SistemaProductoFormRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  const { pathname } = useLocation()
  const planNombre = useTenantStore((s) => s.planNombre)
  if (!esUsuarioSistema(userRole)) return <Navigate to="/admin/productos" replace />
  if (pathname.endsWith('/productos/nuevo')) {
    return <Navigate to={rutaNuevoProductoSeller(planNombre)} replace />
  }
  return <SistemaProductoForm />
}

export function AdminClientesRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaClientes /> : <AdminClientes />
}

export function AdminBlogRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaPosts /> : <AdminBlog />
}

export function AdminCopilotRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaCopilot /> : <AdminCopilot />
}

export function RedirectSiSistema({ to, children }: { to: string; children: ReactNode }) {
  const userRole = useAuthStore((s) => s.userRole)
  if (esUsuarioSistema(userRole)) return <Navigate to={to} replace />
  return children
}
