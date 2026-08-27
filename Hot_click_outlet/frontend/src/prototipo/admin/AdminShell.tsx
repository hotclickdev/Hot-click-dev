import { Outlet, useLocation } from 'react-router-dom'
import AdminBottomNav from './AdminBottomNav'

const TABS = new Set(['dashboard', 'tiendas', 'usuarios', 'moderacion', 'config'])

function muestraNav(pathname: string): boolean {
  const resto = pathname.replace(/\/prototipo\/admin\/?/, '')
  return TABS.has(resto)
}

/**
 * Shell móvil del prototipo Super Admin HotClick.
 */
export default function AdminShell() {
  const { pathname } = useLocation()
  const conNav = muestraNav(pathname)
  return (
    <div className={`min-h-dvh bg-hc-surface text-hc-text ${conNav ? 'pb-16' : ''}`}>
      <Outlet />
      {conNav ? <AdminBottomNav /> : null}
    </div>
  )
}
