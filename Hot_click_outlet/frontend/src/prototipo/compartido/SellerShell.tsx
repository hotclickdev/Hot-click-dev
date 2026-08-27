import { Outlet } from 'react-router-dom'
import SellerBottomNav from './SellerBottomNav'

type Props = {
  sinNav?: boolean
}

/**
 * Shell móvil compartido PYME / Negocio Plus.
 */
export default function SellerShell({ sinNav = false }: Props) {
  const padding = sinNav ? 'pb-6' : 'pb-16'
  return (
    <div className={`min-h-dvh bg-hc-surface text-hc-text ${padding}`}>
      <div className="mx-auto max-w-md">
        <Outlet />
      </div>
      {sinNav ? null : <SellerBottomNav />}
    </div>
  )
}
