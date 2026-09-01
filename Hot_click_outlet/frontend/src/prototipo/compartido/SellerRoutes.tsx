import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SellerShell from './SellerShell'
import MenuPage from './MenuPage'
import ProductosPage from './ProductosPage'
import ProductoFormPage from './ProductoFormPage'
import ElegirTipoProductoPage from './ElegirTipoProductoPage'
import ProductoDetallePage from './ProductoDetallePage'
import EliminarProductoPage from './EliminarProductoPage'
import ReportesPage from './ReportesPage'
import TiendaPublicaPage from './TiendaPublicaPage'
import OpcionesPage from './OpcionesPage'
import PerfilPage from './PerfilPage'
import NotificacionesPage from './NotificacionesPage'
import CobroPage from './CobroPage'
import AyudaPage from './AyudaPage'
import ConsultasPage from './ConsultasPage'
import ProximamentePage from './ProximamentePage'
import CarritoPage from './CarritoPage'
import CompraOkPage from './CompraOkPage'
import BodegasPage from './BodegasPage'
import NuevaBodegaPage from './NuevaBodegaPage'
import DatosNegocioPage from './DatosNegocioPage'
import CompararPlanesPage from './CompararPlanesPage'
import PlanActualizadoPage from './PlanActualizadoPage'
import PedidosPage from './PedidosPage'
import PedidoDetallePage from './PedidoDetallePage'

/**
 * Rutas compartidas PYME / Negocio Plus. `extra` cuelga Equipo o Sucursales.
 */
export default function SellerRoutes({ extra }: { extra?: ReactNode }) {
  return (
    <Routes>
      <Route element={<SellerShell />}>
        <Route index element={<MenuPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="productos/nuevo" element={<ElegirTipoProductoPage />} />
        <Route path="productos/nuevo/catalogo" element={<ProductoFormPage />} />
        <Route path="productos/nuevo/personalizado" element={<ProductoFormPage personalizado />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="tienda" element={<TiendaPublicaPage />} />
        <Route path="opciones" element={<OpcionesPage />} />
      </Route>
      <Route path="login" element={<Navigate to="/login" replace />} />
      <Route path="registro" element={<Navigate to="/registro" replace />} />
      <Route path="pos" element={<Navigate to="/admin/pos" replace />} />
      <Route path="pos/*" element={<Navigate to="/admin/pos" replace />} />
      <Route element={<SellerShell sinNav />}>
        <Route path="productos/:id" element={<ProductoDetallePage />} />
        <Route path="productos/:id/editar" element={<ProductoFormPage />} />
        <Route path="productos/:id/eliminar" element={<EliminarProductoPage />} />
        <Route path="carrito" element={<CarritoPage />} />
        <Route path="compra-ok" element={<CompraOkPage />} />
        <Route path="perfil" element={<PerfilPage />} />
        <Route path="notificaciones" element={<NotificacionesPage />} />
        <Route path="cobro" element={<CobroPage />} />
        <Route path="ayuda" element={<AyudaPage />} />
        <Route path="consultas" element={<ConsultasPage />} />
        <Route path="proximamente" element={<ProximamentePage />} />
        <Route path="bodegas" element={<BodegasPage />} />
        <Route path="bodegas/nueva" element={<NuevaBodegaPage />} />
        <Route path="negocio" element={<DatosNegocioPage />} />
        <Route path="plan" element={<CompararPlanesPage />} />
        <Route path="plan/actualizado" element={<PlanActualizadoPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="pedidos/:id" element={<PedidoDetallePage />} />
        {extra}
      </Route>
    </Routes>
  )
}
