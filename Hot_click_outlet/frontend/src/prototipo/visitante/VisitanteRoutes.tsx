import { Route, Routes } from 'react-router-dom'
import VisitanteAsesorIaPage from './VisitanteAsesorIaPage'
import VisitanteAsistentePage from './VisitanteAsistentePage'
import VisitanteAyudaPage from './VisitanteAyudaPage'
import VisitanteCarritoPage from './VisitanteCarritoPage'
import VisitanteCheckoutPage from './VisitanteCheckoutPage'
import VisitanteConfirmadaPage from './VisitanteConfirmadaPage'
import VisitanteCuentaPage from './VisitanteCuentaPage'
import VisitanteDireccionesPage from './VisitanteDireccionesPage'
import VisitanteDiscoverPage from './VisitanteDiscoverPage'
import VisitanteFavoritosPage from './VisitanteFavoritosPage'
import VisitanteIndexPage from './VisitanteIndexPage'
import VisitanteMetodosPagoPage from './VisitanteMetodosPagoPage'
import VisitanteNegocioPage from './VisitanteNegocioPage'
import VisitanteNotificacionesPage from './VisitanteNotificacionesPage'
import VisitantePagoFallidoPage from './VisitantePagoFallidoPage'
import VisitantePedidosPage from './VisitantePedidosPage'
import VisitanteProductoPage from './VisitanteProductoPage'
import VisitanteRecomendadosPage from './VisitanteRecomendadosPage'
import VisitanteShell from './VisitanteShell'
import VisitanteShopPage from './VisitanteShopPage'

/**
 * Rutas del prototipo Visitante (Figma 96:128).
 */
export default function VisitanteRoutes() {
  return (
    <Routes>
      <Route element={<VisitanteShell />}>
        <Route index element={<VisitanteIndexPage />} />
        <Route path="shop" element={<VisitanteShopPage />} />
        <Route path="shop/sin-resultados" element={<VisitanteShopPage sinResultados />} />
        <Route path="discover" element={<VisitanteDiscoverPage />} />
        <Route path="carrito" element={<VisitanteCarritoPage />} />
        <Route path="carrito/vacio" element={<VisitanteCarritoPage vacio />} />
        <Route path="cuenta" element={<VisitanteCuentaPage />} />
        <Route path="asistente" element={<VisitanteAsistentePage />} />
        <Route path="producto/:id" element={<VisitanteProductoPage />} />
        <Route path="asesor-ia" element={<VisitanteAsesorIaPage />} />
        <Route path="checkout" element={<VisitanteCheckoutPage />} />
        <Route path="compra-confirmada" element={<VisitanteConfirmadaPage />} />
        <Route path="pago-fallido" element={<VisitantePagoFallidoPage />} />
        <Route path="recomendados" element={<VisitanteRecomendadosPage />} />
        <Route path="negocio/:id" element={<VisitanteNegocioPage />} />
        <Route path="favoritos" element={<VisitanteFavoritosPage />} />
        <Route path="notificaciones" element={<VisitanteNotificacionesPage />} />
        <Route path="pedidos" element={<VisitantePedidosPage />} />
        <Route path="direcciones" element={<VisitanteDireccionesPage />} />
        <Route path="metodos-pago" element={<VisitanteMetodosPagoPage />} />
        <Route path="ayuda" element={<VisitanteAyudaPage />} />
      </Route>
    </Routes>
  )
}
