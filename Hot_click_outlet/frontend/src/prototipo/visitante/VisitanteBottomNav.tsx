import { NavLink, useLocation } from 'react-router-dom'
import { IconoBolsa, IconoCarrito, IconoCasa, IconoCuenta, IconoDiscover } from './VisitanteIcons'
import { visitanteRuta } from './visitanteMock'
import useCartStore from '@/store/cartStore'

/**
 * Bottom nav del prototipo Visitante (Figma 96:128).
 */
export default function VisitanteBottomNav() {
  const { pathname } = useLocation()
  const count = useCartStore((s) => s.count) as () => number
  const badge = count()
  const items = [
    { to: visitanteRuta(), label: 'Home', end: true as const, Icon: IconoCasa },
    { to: visitanteRuta('shop'), label: 'Shop', Icon: IconoBolsa, dataMm: 'vis-nav-shop' },
    { to: visitanteRuta('discover'), label: 'Discover', Icon: IconoDiscover },
    { to: visitanteRuta('carrito'), label: 'Cart', Icon: IconoCarrito, badge, dataMm: 'vis-nav-carrito' },
    { to: visitanteRuta('cuenta'), label: 'Account', Icon: IconoCuenta },
  ]
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
      aria-label="Navegación visitante"
    >
      <ul className="grid grid-cols-5 px-2 pb-5 pt-2.5">
        {items.map((item) => {
          const activa = tabActiva(pathname, item.to, Boolean(item.end))
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={Boolean(item.end)}
                {...('dataMm' in item && item.dataMm ? { 'data-mm': item.dataMm } : {})}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 ${
                  activa ? 'text-hc-accent' : 'text-hc-muted'
                }`}
              >
                <span className="relative">
                  <item.Icon className="size-[18px]" />
                  {'badge' in item && item.badge ? (
                    <span className="absolute -right-2 -top-1 flex size-[13px] items-center justify-center rounded-full bg-hc-accent text-[8px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[9px] ${activa ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function tabActiva(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to || pathname === `${to}/`
  if (to === '/productos') return pathname === '/productos' || pathname.startsWith('/productos/')
  return pathname === to || pathname.startsWith(`${to}/`)
}
