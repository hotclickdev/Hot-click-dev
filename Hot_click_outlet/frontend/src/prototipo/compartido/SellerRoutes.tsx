import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import SellerShell from './SellerShell'
import MenuPage from './MenuPage'
import ProductosPage from './ProductosPage'
import ProductoFormPage from './ProductoFormPage'
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
import PosPage from './PosPage'
import CobrarPage from './CobrarPage'
import VentaOkPage from './VentaOkPage'
import QrPagoPage from './QrPagoPage'
import PedidosPage from './PedidosPage'
import PedidoDetallePage from './PedidoDetallePage'
import LoginPage from './LoginPage'
import RegistroPage from './RegistroPage'

/**
 * Rutas compartidas PYME / Negocio Plus. `extra` cuelga Equipo o Sucursales.
 */
export default function SellerRoutes({ extra }: { extra?: ReactNode }) {
  return (
    <Routes>
      <Route element={<SellerShell />}>
        <Route index element={<MenuPage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="productos/nuevo" element={<ProductoFormPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="tienda" element={<TiendaPublicaPage />} />
        <Route path="opciones" element={<OpcionesPage />} />
      </Route>
      <Route element={<SellerShell sinNav />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegistroPage />} />
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
        <Route path="pos" element={<PosPage />} />
        <Route path="pos/cobrar" element={<CobrarPage />} />
        <Route path="pos/venta" element={<VentaOkPage />} />
        <Route path="pos/qr" element={<QrPagoPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="pedidos/:id" element={<PedidoDetallePage />} />
        {extra}
      </Route>
    </Routes>
  )
}
