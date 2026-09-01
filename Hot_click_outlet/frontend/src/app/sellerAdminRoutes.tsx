import { lazy, type ReactNode } from 'react'
import { Navigate, Route } from 'react-router-dom'
import SellerPagePad from '@/app/SellerPagePad'
import {
  AdminBlogRoute,
  AdminClientesRoute,
  AdminCopilotRoute,
  AdminHomeRoute,
  AdminPedidosRoute,
  AdminProductosRoute,
  AdminPromocionesRoute,
  AdminReportesRoute,
  SistemaProductoFormRoute,
} from '@/app/routeGuards'

const AdminWarehouses = lazy(() => import('@/pages/admin/AdminWarehouses'))
const AdminMiEmpresa = lazy(() => import('@/pages/admin/AdminMiEmpresa'))
const AdminPlanes = lazy(() => import('@/pages/admin/AdminPlanes'))
const AdminAyuda = lazy(() => import('@/pages/admin/AdminAyuda'))
const AdminEquipo = lazy(() => import('@/pages/admin/AdminEquipo'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))

function Pagina({ children }: { children: ReactNode }) {
  return <SellerPagePad>{children}</SellerPagePad>
}

/** Rutas con nav principal (inicio, productos, reportes, tienda, opciones hub). */
export function rutasSellerConNav(opcionesHub: ReactNode, tiendaPreview: ReactNode) {
  return (
    <>
      <Route index element={<Pagina><AdminHomeRoute /></Pagina>} />
      <Route path="productos" element={<Pagina><AdminProductosRoute /></Pagina>} />
      <Route path="reportes" element={<Pagina><AdminReportesRoute /></Pagina>} />
      <Route path="tienda" element={tiendaPreview} />
      <Route path="opciones" element={opcionesHub} />
    </>
  )
}

function rutasProductosPedidos() {
  return (
    <>
      <Route path="productos/nuevo" element={<Pagina><SistemaProductoFormRoute /></Pagina>} />
      <Route path="productos/:id/editar" element={<Pagina><SistemaProductoFormRoute /></Pagina>} />
      <Route path="productos/:id" element={<Navigate to="editar" replace />} />
      <Route path="pedidos" element={<Pagina><AdminPedidosRoute /></Pagina>} />
      <Route path="pedidos/:id" element={<Navigate to=".." replace />} />
      <Route path="ofertas" element={<Pagina><AdminPromocionesRoute /></Pagina>} />
      <Route path="clientes" element={<Pagina><AdminClientesRoute /></Pagina>} />
      <Route path="blog" element={<Pagina><AdminBlogRoute /></Pagina>} />
      <Route path="equipo" element={<Pagina><AdminEquipo /></Pagina>} />
    </>
  )
}

/** Opciones anidadas (`/emprendedor/opciones/...`) — redirects desde `/admin`. */
function rutasOpcionesAnidadas() {
  return (
    <>
      <Route path="opciones/perfil" element={<Pagina><ProfilePage /></Pagina>} />
      <Route path="opciones/negocio" element={<Pagina><AdminMiEmpresa /></Pagina>} />
      <Route path="opciones/bodegas" element={<Pagina><AdminWarehouses /></Pagina>} />
      <Route path="opciones/bodegas/nueva" element={<Pagina><AdminWarehouses /></Pagina>} />
      <Route path="opciones/plan" element={<Pagina><AdminPlanes /></Pagina>} />
      <Route path="opciones/plan/actualizado" element={<Navigate to=".." replace />} />
      <Route path="opciones/consultas" element={<Pagina><AdminCopilotRoute /></Pagina>} />
      <Route path="opciones/ayuda" element={<Pagina><AdminAyuda /></Pagina>} />
    </>
  )
}

/** Alias planos PYME (`/pyme/bodegas`, `/pyme/plan`, …). */
function rutasOpcionesPlanas() {
  return (
    <>
      <Route path="perfil" element={<Pagina><ProfilePage /></Pagina>} />
      <Route path="negocio" element={<Pagina><AdminMiEmpresa /></Pagina>} />
      <Route path="bodegas" element={<Pagina><AdminWarehouses /></Pagina>} />
      <Route path="bodegas/nueva" element={<Pagina><AdminWarehouses /></Pagina>} />
      <Route path="plan" element={<Pagina><AdminPlanes /></Pagina>} />
      <Route path="plan/actualizado" element={<Navigate to=".." replace />} />
      <Route path="consultas" element={<Pagina><AdminCopilotRoute /></Pagina>} />
      <Route path="ayuda" element={<Pagina><AdminAyuda /></Pagina>} />
    </>
  )
}

/** Rutas secundarias sin bottom nav (formularios, detalle, opciones profundas). */
export function rutasSellerSinNav({ planas = false }: { planas?: boolean } = {}) {
  return (
    <>
      {rutasProductosPedidos()}
      {rutasOpcionesAnidadas()}
      {planas ? rutasOpcionesPlanas() : null}
      <Route path="proximamente" element={<Navigate to=".." replace />} />
    </>
  )
}

/** Redirects compartidos fuera del shell (login, POS). */
export function rutasSellerExternas() {
  return (
    <>
      <Route path="login" element={<Navigate to="/login" replace />} />
      <Route path="registro" element={<Navigate to="/registro" replace />} />
      <Route path="pos" element={<Navigate to="/admin/pos" replace />} />
      <Route path="pos/*" element={<Navigate to="/admin/pos" replace />} />
    </>
  )
}
