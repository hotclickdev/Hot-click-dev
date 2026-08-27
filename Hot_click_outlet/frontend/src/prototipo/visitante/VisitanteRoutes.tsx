import { Route, Routes } from 'react-router-dom'
import VisitanteIndexPage from './VisitanteIndexPage'
import VisitantePlaceholderPage from './VisitantePlaceholderPage'
import VisitanteShell from './VisitanteShell'

/**
 * Rutas del prototipo Visitante (Figma 96:128).
 */
export default function VisitanteRoutes() {
  return (
    <Routes>
      <Route element={<VisitanteShell />}>
        <Route index element={<VisitanteIndexPage />} />
        <Route path="shop" element={<VisitantePlaceholderPage titulo="Shop" />} />
        <Route path="discover" element={<VisitantePlaceholderPage titulo="Discover" />} />
        <Route path="carrito" element={<VisitantePlaceholderPage titulo="Carrito" />} />
        <Route path="cuenta" element={<VisitantePlaceholderPage titulo="Account" />} />
      </Route>
    </Routes>
  )
}
