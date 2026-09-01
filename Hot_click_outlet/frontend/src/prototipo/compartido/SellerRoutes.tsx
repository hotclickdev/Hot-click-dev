import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import SellerShell from './SellerShell'
import OpcionesPage from './OpcionesPage'
import TiendaPublicaPage from './TiendaPublicaPage'
import NotificacionesPage from './NotificacionesPage'
import CobroPage from './CobroPage'
import CarritoPage from './CarritoPage'
import CompraOkPage from './CompraOkPage'
import ProximamentePage from './ProximamentePage'
import {
  rutasSellerConNav,
  rutasSellerExternas,
  rutasSellerSinNav,
} from '@/app/sellerAdminRoutes'

/**
 * PYME / Negocio Plus: shell Figma + páginas reales; `extra` cuelga Equipo o Sucursales.
 */
export default function SellerRoutes({ extra }: { extra?: ReactNode }) {
  return (
    <Routes>
      {rutasSellerExternas()}
      <Route element={<SellerShell />}>
        {rutasSellerConNav(<OpcionesPage />, <TiendaPublicaPage />)}
      </Route>
      <Route element={<SellerShell sinNav />}>
        {rutasSellerSinNav({ planas: true })}
        <Route path="notificaciones" element={<NotificacionesPage />} />
        <Route path="cobro" element={<CobroPage />} />
        <Route path="carrito" element={<CarritoPage />} />
        <Route path="compra-ok" element={<CompraOkPage />} />
        <Route path="proximamente" element={<ProximamentePage />} />
        {extra}
      </Route>
    </Routes>
  )
}
