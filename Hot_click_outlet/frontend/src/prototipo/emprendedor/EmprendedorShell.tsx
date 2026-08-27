import { Outlet } from 'react-router-dom'
import EmprendedorBottomNav from './EmprendedorBottomNav'

type Props = { conNav?: boolean }

/**
 * Shell móvil iPhone 11 del prototipo Emprendedor.
 */
export default function EmprendedorShell({ conNav = false }: Props) {
  return (
    <div className="min-h-dvh bg-hc-surface text-hc-text">
      <div className={`mx-auto max-w-md ${conNav ? 'pb-16' : ''}`}>
        <Outlet />
      </div>
      {conNav ? <EmprendedorBottomNav /> : null}
    </div>
  )
}
