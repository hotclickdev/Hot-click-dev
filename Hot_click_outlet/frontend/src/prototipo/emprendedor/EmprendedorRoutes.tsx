import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import EmprendedorShell from './EmprendedorShell'
import { RUTA_EMPRENDEDOR } from './constants'

const MenuPage = lazy(() => import('./pages/MenuPage'))
const ProductosPage = lazy(() => import('./pages/ProductosPage'))
const ProductosVacioPage = lazy(() => import('./pages/ProductosVacioPage'))
const AgregarProductoPage = lazy(() => import('./pages/AgregarProductoPage'))
const ElegirTipoProductoPage = lazy(() => import('./pages/ElegirTipoProductoPage'))
const EncargosPage = lazy(() => import('./pages/EncargosPage'))
const RecoleccionPage = lazy(() => import('./pages/RecoleccionPage'))
const EditarProductoPage = lazy(() => import('./pages/EditarProductoPage'))
const ConfirmarEliminacionPage = lazy(() => import('./pages/ConfirmarEliminacionPage'))
const ReportesPage = lazy(() => import('./pages/ReportesPage'))
const TiendaPublicaPage = lazy(() => import('./pages/TiendaPublicaPage'))
const DetalleProductoPage = lazy(() => import('./pages/DetalleProductoPage'))
const CarritoPage = lazy(() => import('./pages/CarritoPage'))
const CompraConfirmadaPage = lazy(() => import('./pages/CompraConfirmadaPage'))
const OpcionesPage = lazy(() => import('./pages/OpcionesPage'))
const PerfilPage = lazy(() => import('./pages/PerfilPage'))
const NotificacionesPage = lazy(() => import('./pages/NotificacionesPage'))
const TelegramPage = lazy(() => import('./pages/TelegramPage'))
const CobroPage = lazy(() => import('./pages/CobroPage'))
const AgregarMetodoCobroPage = lazy(() => import('./pages/AgregarMetodoCobroPage'))
const AyudaPage = lazy(() => import('./pages/AyudaPage'))
const ConsultasHotPage = lazy(() => import('./pages/ConsultasHotPage'))
const ProximamentePage = lazy(() => import('./pages/ProximamentePage'))
const BodegasPage = lazy(() => import('./pages/BodegasPage'))
const NuevaBodegaPage = lazy(() => import('./pages/NuevaBodegaPage'))
const PedidosPage = lazy(() => import('./pages/PedidosPage'))
const DetallePedidoPage = lazy(() => import('./pages/DetallePedidoPage'))
const DatosNegocioPage = lazy(() => import('./pages/DatosNegocioPage'))
const PlanesPage = lazy(() => import('./pages/PlanesPage'))
const PlanActualizadoPage = lazy(() => import('./pages/PlanActualizadoPage'))

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
 * Rutas del prototipo Emprendedor (Figma Page 1, iPhone 11).
 */
export default function EmprendedorRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to="/login" replace />} />
      <Route path="registro" element={<Navigate to="/registro" replace />} />
      <Route path="pos" element={<Navigate to="/admin/pos" replace />} />
      <Route path="pos/*" element={<Navigate to="/admin/pos" replace />} />
      <Route path="bodegas" element={<Navigate to="opciones/bodegas" replace />} />
      <Route path="bodegas/nueva" element={<Navigate to="opciones/bodegas/nueva" replace />} />
      <Route path="negocio" element={<Navigate to="opciones/negocio" replace />} />
      <Route path="plan" element={<Navigate to="opciones/plan" replace />} />
      <Route path="plan/actualizado" element={<Navigate to="opciones/plan/actualizado" replace />} />
      <Route path="ayuda" element={<Navigate to="opciones/ayuda" replace />} />
      <Route path="consultas" element={<Navigate to="opciones/consultas" replace />} />
      <Route path="perfil" element={<Navigate to="opciones/perfil" replace />} />
      <Route path="cobro" element={<Navigate to="opciones/cobro" replace />} />
      <Route path="cobro/nuevo" element={<Navigate to="opciones/cobro/nuevo" replace />} />
      <Route path="telegram" element={<Navigate to="opciones/telegram" replace />} />
      <Route element={<EmprendedorShell conNav />}>
        <Route index element={page(MenuPage)} />
        <Route path="productos" element={page(ProductosPage)} />
        <Route path="encargos" element={page(EncargosPage)} />
        <Route path="recoleccion" element={page(RecoleccionPage)} />
        <Route path="productos/vacio" element={page(ProductosVacioPage)} />
        <Route path="productos/nuevo" element={page(ElegirTipoProductoPage)} />
        <Route path="productos/nuevo/catalogo" element={page(AgregarProductoPage)} />
        <Route path="productos/nuevo/personalizado" element={<LazyPage><AgregarProductoPage personalizado /></LazyPage>} />
        <Route path="tienda" element={page(TiendaPublicaPage)} />
        <Route path="reportes" element={page(ReportesPage)} />
        <Route path="opciones" element={page(OpcionesPage)} />
      </Route>
      <Route element={<EmprendedorShell />}>
        <Route path="productos/:id/editar" element={page(EditarProductoPage)} />
        <Route path="productos/:id/eliminar" element={page(ConfirmarEliminacionPage)} />
        <Route path="tienda/carrito" element={page(CarritoPage)} />
        <Route path="tienda/compra-confirmada" element={page(CompraConfirmadaPage)} />
        <Route path="tienda/:id" element={page(DetalleProductoPage)} />
        <Route path="opciones/perfil" element={page(PerfilPage)} />
        <Route path="opciones/notificaciones" element={page(NotificacionesPage)} />
        <Route path="opciones/telegram" element={page(TelegramPage)} />
        <Route path="opciones/cobro" element={page(CobroPage)} />
        <Route path="opciones/cobro/nuevo" element={page(AgregarMetodoCobroPage)} />
        <Route path="opciones/ayuda" element={page(AyudaPage)} />
        <Route path="opciones/consultas" element={page(ConsultasHotPage)} />
        <Route path="opciones/bodegas" element={page(BodegasPage)} />
        <Route path="opciones/bodegas/nueva" element={page(NuevaBodegaPage)} />
        <Route path="opciones/negocio" element={page(DatosNegocioPage)} />
        <Route path="opciones/plan" element={page(PlanesPage)} />
        <Route path="opciones/plan/actualizado" element={page(PlanActualizadoPage)} />
        <Route path="proximamente/pedidos" element={<Navigate to={`${RUTA_EMPRENDEDOR}/pedidos`} replace />} />
        <Route path="proximamente/bodegas" element={<Navigate to={`${RUTA_EMPRENDEDOR}/opciones/bodegas`} replace />} />
        <Route path="proximamente/productos" element={<Navigate to={`${RUTA_EMPRENDEDOR}/productos`} replace />} />
        <Route path="proximamente/reportes" element={<Navigate to={`${RUTA_EMPRENDEDOR}/reportes`} replace />} />
        <Route path="proximamente/negocio" element={<Navigate to={`${RUTA_EMPRENDEDOR}/opciones/negocio`} replace />} />
        <Route path="proximamente" element={page(ProximamentePage)} />
        <Route path="pedidos" element={page(PedidosPage)} />
        <Route path="pedidos/:id" element={page(DetallePedidoPage)} />
      </Route>
    </Routes>
  )
}
