import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SellerShell from './SellerShell'

const MenuPage = lazy(() => import('./MenuPage'))
const ProductosPage = lazy(() => import('./ProductosPage'))
const ProductoFormPage = lazy(() => import('./ProductoFormPage'))
const ElegirTipoProductoPage = lazy(() => import('./ElegirTipoProductoPage'))
const ProductoDetallePage = lazy(() => import('./ProductoDetallePage'))
const EliminarProductoPage = lazy(() => import('./EliminarProductoPage'))
const ReportesPage = lazy(() => import('./ReportesPage'))
const TiendaPublicaPage = lazy(() => import('./TiendaPublicaPage'))
const OpcionesPage = lazy(() => import('./OpcionesPage'))
const PerfilPage = lazy(() => import('./PerfilPage'))
const NotificacionesPage = lazy(() => import('./NotificacionesPage'))
const CobroPage = lazy(() => import('./CobroPage'))
const AgregarMetodoCobroPage = lazy(() => import('./AgregarMetodoCobroPage'))
const AyudaPage = lazy(() => import('./AyudaPage'))
const ConsultasPage = lazy(() => import('./ConsultasPage'))
const ProximamentePage = lazy(() => import('./ProximamentePage'))
const CarritoPage = lazy(() => import('./CarritoPage'))
const CompraOkPage = lazy(() => import('./CompraOkPage'))
const BodegasPage = lazy(() => import('./BodegasPage'))
const NuevaBodegaPage = lazy(() => import('./NuevaBodegaPage'))
const DatosNegocioPage = lazy(() => import('./DatosNegocioPage'))
const CompararPlanesPage = lazy(() => import('./CompararPlanesPage'))
const PlanActualizadoPage = lazy(() => import('./PlanActualizadoPage'))
const PedidosPage = lazy(() => import('./PedidosPage'))
const PedidoDetallePage = lazy(() => import('./PedidoDetallePage'))
const RecoleccionSellerPage = lazy(() => import('./RecoleccionSellerPage'))
const EncargosSellerPage = lazy(() => import('./EncargosSellerPage'))

function SpinnerRuta() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="size-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
      />
    </div>
  )
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SpinnerRuta />}>{children}</Suspense>
}

function page(Comp: ComponentType) {
  return (
    <LazyPage>
      <Comp />
    </LazyPage>
  )
}

/**
 * Rutas compartidas PYME / Negocio Plus. `extra` cuelga Equipo o Sucursales.
 */
export default function SellerRoutes({ extra }: { extra?: ReactNode }) {
  return (
    <Routes>
      <Route element={<SellerShell />}>
        <Route index element={page(MenuPage)} />
        <Route path="productos" element={page(ProductosPage)} />
        <Route path="productos/nuevo" element={page(ElegirTipoProductoPage)} />
        <Route path="productos/nuevo/catalogo" element={page(ProductoFormPage)} />
        <Route path="productos/nuevo/personalizado" element={<LazyPage><ProductoFormPage personalizado /></LazyPage>} />
        <Route path="reportes" element={page(ReportesPage)} />
        <Route path="tienda" element={page(TiendaPublicaPage)} />
        <Route path="opciones" element={page(OpcionesPage)} />
        <Route path="recoleccion" element={page(RecoleccionSellerPage)} />
        <Route path="encargos" element={page(EncargosSellerPage)} />
      </Route>
      <Route path="login" element={<Navigate to="/login" replace />} />
      <Route path="registro" element={<Navigate to="/registro" replace />} />
      <Route path="pos" element={<Navigate to="/admin/pos" replace />} />
      <Route path="pos/*" element={<Navigate to="/admin/pos" replace />} />
      <Route element={<SellerShell sinNav />}>
        <Route path="productos/:id" element={page(ProductoDetallePage)} />
        <Route path="productos/:id/editar" element={page(ProductoFormPage)} />
        <Route path="productos/:id/eliminar" element={page(EliminarProductoPage)} />
        <Route path="carrito" element={page(CarritoPage)} />
        <Route path="compra-ok" element={page(CompraOkPage)} />
        <Route path="perfil" element={page(PerfilPage)} />
        <Route path="notificaciones" element={page(NotificacionesPage)} />
        <Route path="cobro" element={page(CobroPage)} />
        <Route path="cobro/nuevo" element={page(AgregarMetodoCobroPage)} />
        <Route path="ayuda" element={page(AyudaPage)} />
        <Route path="consultas" element={page(ConsultasPage)} />
        <Route path="proximamente" element={page(ProximamentePage)} />
        <Route path="bodegas" element={page(BodegasPage)} />
        <Route path="bodegas/nueva" element={page(NuevaBodegaPage)} />
        <Route path="negocio" element={page(DatosNegocioPage)} />
        <Route path="plan" element={page(CompararPlanesPage)} />
        <Route path="plan/actualizado" element={page(PlanActualizadoPage)} />
        <Route path="pedidos" element={page(PedidosPage)} />
        <Route path="pedidos/:id" element={page(PedidoDetallePage)} />
        {extra}
      </Route>
    </Routes>
  )
}
