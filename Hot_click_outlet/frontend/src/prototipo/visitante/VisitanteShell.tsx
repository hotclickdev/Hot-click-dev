import { Outlet } from 'react-router-dom'
import VisitanteBottomNav from './VisitanteBottomNav'

/**
 * Shell móvil del prototipo Usuario Visitante.
 */
export default function VisitanteShell() {
  return (
    <div className="min-h-dvh bg-hc-bg pb-16 text-hc-text">
      <Outlet />
      <VisitanteBottomNav />
    </div>
  )
}
