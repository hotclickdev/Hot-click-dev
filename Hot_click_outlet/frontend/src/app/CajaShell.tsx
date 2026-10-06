import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, Route, useLocation } from 'react-router-dom'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import POSShell from '@/layouts/POSShell'
import useAuthStore from '@/store/authStore'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { isTokenAlive } from '@/utils/authToken'
import { ROLES_POS, esStaffPlataforma, esUsuarioSistema } from '@/utils/sistemaUser'

const AdminPOS = lazy(() => import('@/pages/admin/pos/AdminPOS'))
const AdminPOSCaja = lazy(() => import('@/pages/admin/pos/AdminPOSCaja'))
const AdminPOSHistorial = lazy(() => import('@/pages/admin/pos/AdminPOSHistorial'))

function SpinnerCaja() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hc-bg">
      <div
        className="size-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
      />
    </div>
  )
}

function Pagina({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SpinnerCaja />}>{children}</Suspense>
}

/** Caja fuera de `/admin`. Vendedores y roles de caja; la plataforma no entra. */
export function CajaAcceso() {
  const { pathname, search } = useLocation()
  const token = useAuthStore((s) => s.token)
  const rol = useAuthStore((s) => s.userRole) ?? ''

  if (!isTokenAlive(token)) {
    return <Navigate to={rutaLoginConRetorno(`${pathname}${search}`)} replace />
  }
  if (esStaffPlataforma(rol)) return <Navigate to="/admin" replace />
  if (!esUsuarioSistema(rol) && !ROLES_POS.has(rol)) return <Navigate to="/" replace />

  return (
    <AdminErrorBoundary>
      <POSShell>
        <Suspense fallback={<SpinnerCaja />}>
          <Outlet />
        </Suspense>
      </POSShell>
    </AdminErrorBoundary>
  )
}

export function hijosCaja() {
  return [
    <Route key="venta" index element={<Pagina><AdminPOS /></Pagina>} />,
    <Route key="cuadre" path="caja" element={<Pagina><AdminPOSCaja /></Pagina>} />,
    <Route key="historial" path="historial" element={<Pagina><AdminPOSHistorial /></Pagina>} />,
  ]
}

/** `pos`, `pos/caja` y `pos/historial` bajo el prefijo del plan. */
export function rutasCajaRelativas() {
  return (
    <Route path="pos" element={<CajaAcceso />}>
      {hijosCaja()}
    </Route>
  )
}
