import { Route, Routes } from 'react-router-dom'
import EmprendedorShell from './EmprendedorShell'
import OpcionesPage from './pages/OpcionesPage'
import TiendaPublicaPage from './pages/TiendaPublicaPage'
import CarritoPage from './pages/CarritoPage'
import CompraConfirmadaPage from './pages/CompraConfirmadaPage'
import DetalleProductoPage from './pages/DetalleProductoPage'
import NotificacionesPage from './pages/NotificacionesPage'
import CobroPage from './pages/CobroPage'
import {
  rutasSellerConNav,
  rutasSellerExternas,
  rutasSellerSinNav,
} from '@/app/sellerAdminRoutes'

/**
 * Emprendedor: shell Figma + páginas reales de negocio (misma lógica que `/admin/*`).
 */
export default function EmprendedorRoutes() {
  return (
    <Routes>
      {rutasSellerExternas()}
      <Route element={<EmprendedorShell conNav />}>
        {rutasSellerConNav(<OpcionesPage />, <TiendaPublicaPage />)}
      </Route>
      <Route element={<EmprendedorShell />}>
        {rutasSellerSinNav()}
        <Route path="tienda/carrito" element={<CarritoPage />} />
        <Route path="tienda/compra-confirmada" element={<CompraConfirmadaPage />} />
        <Route path="tienda/:id" element={<DetalleProductoPage />} />
        <Route path="opciones/notificaciones" element={<NotificacionesPage />} />
        <Route path="opciones/cobro" element={<CobroPage />} />
      </Route>
    </Routes>
  )
}
