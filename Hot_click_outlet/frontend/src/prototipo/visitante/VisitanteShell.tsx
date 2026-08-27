import { Outlet, useLocation } from 'react-router-dom'
import VisitanteBottomNav from './VisitanteBottomNav'

const SIN_NAV = [
  'asistente',
  'asesor-ia',
  'checkout',
  'compra-confirmada',
  'pago-fallido',
  'pedidos',
  'direcciones',
  'metodos-pago',
  'ayuda',
]

function muestraNav(pathname: string): boolean {
  if (pathname.includes('/producto/')) return false
  if (pathname.includes('/negocio/')) return false
  return !SIN_NAV.some((seg) => pathname.endsWith(`/${seg}`))
}

/**
 * Shell móvil del prototipo Usuario Visitante.
 */
export default function VisitanteShell() {
  const { pathname } = useLocation()
  const conNav = muestraNav(pathname)
  return (
    <div className={`min-h-dvh bg-hc-bg text-hc-text ${conNav ? 'pb-16' : ''}`}>
      <Outlet />
      {conNav ? <VisitanteBottomNav /> : null}
    </div>
  )
}
