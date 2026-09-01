import { Navigate, Route, Routes } from 'react-router-dom'
import EmprendedorShell from './EmprendedorShell'
import MenuPage from './pages/MenuPage'
import ProductosPage from './pages/ProductosPage'
import ProductosVacioPage from './pages/ProductosVacioPage'
import AgregarProductoPage from './pages/AgregarProductoPage'
import ElegirTipoProductoPage from './pages/ElegirTipoProductoPage'
import EditarProductoPage from './pages/EditarProductoPage'
import ConfirmarEliminacionPage from './pages/ConfirmarEliminacionPage'
import ReportesPage from './pages/ReportesPage'
import TiendaPublicaPage from './pages/TiendaPublicaPage'
import DetalleProductoPage from './pages/DetalleProductoPage'
import CarritoPage from './pages/CarritoPage'
import CompraConfirmadaPage from './pages/CompraConfirmadaPage'
import OpcionesPage from './pages/OpcionesPage'
import PerfilPage from './pages/PerfilPage'
import NotificacionesPage from './pages/NotificacionesPage'
import CobroPage from './pages/CobroPage'
import AyudaPage from './pages/AyudaPage'
import ConsultasHotPage from './pages/ConsultasHotPage'
import ProximamentePage from './pages/ProximamentePage'
import BodegasPage from './pages/BodegasPage'
import NuevaBodegaPage from './pages/NuevaBodegaPage'
import PedidosPage from './pages/PedidosPage'
import DetallePedidoPage from './pages/DetallePedidoPage'
import DatosNegocioPage from './pages/DatosNegocioPage'
import PlanesPage from './pages/PlanesPage'
import PlanActualizadoPage from './pages/PlanActualizadoPage'
import { RUTA_EMPRENDEDOR } from './constants'

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
      <Route element={<EmprendedorShell conNav />}>
        <Route index element={<MenuPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="productos/vacio" element={<ProductosVacioPage />} />
        <Route path="productos/nuevo" element={<ElegirTipoProductoPage />} />
        <Route path="productos/nuevo/catalogo" element={<AgregarProductoPage />} />
        <Route path="productos/nuevo/personalizado" element={<AgregarProductoPage personalizado />} />
        <Route path="tienda" element={<TiendaPublicaPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="opciones" element={<OpcionesPage />} />
      </Route>
      <Route element={<EmprendedorShell />}>
        <Route path="productos/:id/editar" element={<EditarProductoPage />} />
        <Route path="productos/:id/eliminar" element={<ConfirmarEliminacionPage />} />
        <Route path="tienda/carrito" element={<CarritoPage />} />
        <Route path="tienda/compra-confirmada" element={<CompraConfirmadaPage />} />
        <Route path="tienda/:id" element={<DetalleProductoPage />} />
        <Route path="opciones/perfil" element={<PerfilPage />} />
        <Route path="opciones/notificaciones" element={<NotificacionesPage />} />
        <Route path="opciones/cobro" element={<CobroPage />} />
        <Route path="opciones/ayuda" element={<AyudaPage />} />
        <Route path="opciones/consultas" element={<ConsultasHotPage />} />
        <Route path="opciones/bodegas" element={<BodegasPage />} />
        <Route path="opciones/bodegas/nueva" element={<NuevaBodegaPage />} />
        <Route path="opciones/negocio" element={<DatosNegocioPage />} />
        <Route path="opciones/plan" element={<PlanesPage />} />
        <Route path="opciones/plan/actualizado" element={<PlanActualizadoPage />} />
        <Route path="proximamente/pedidos" element={<Navigate to={`${RUTA_EMPRENDEDOR}/pedidos`} replace />} />
        <Route path="proximamente/bodegas" element={<Navigate to={`${RUTA_EMPRENDEDOR}/opciones/bodegas`} replace />} />
        <Route path="proximamente/productos" element={<Navigate to={`${RUTA_EMPRENDEDOR}/productos`} replace />} />
        <Route path="proximamente/reportes" element={<Navigate to={`${RUTA_EMPRENDEDOR}/reportes`} replace />} />
        <Route path="proximamente/negocio" element={<Navigate to={`${RUTA_EMPRENDEDOR}/opciones/negocio`} replace />} />
        <Route path="proximamente" element={<ProximamentePage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="pedidos/:id" element={<DetallePedidoPage />} />
      </Route>
    </Routes>
  )
}
