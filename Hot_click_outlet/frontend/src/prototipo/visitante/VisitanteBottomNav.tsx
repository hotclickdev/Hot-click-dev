import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/prototipo/visitante', label: 'Home', end: true },
  { to: '/prototipo/visitante/shop', label: 'Shop' },
  { to: '/prototipo/visitante/discover', label: 'Discover' },
  { to: '/prototipo/visitante/carrito', label: 'Cart' },
  { to: '/prototipo/visitante/cuenta', label: 'Account' },
] as const

/**
 * Bottom nav del prototipo Visitante (Figma 96:128).
 */
export default function VisitanteBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
      aria-label="Navegación visitante"
    >
      <ul className="grid grid-cols-5 px-1 py-2">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `flex min-h-11 items-center justify-center text-xs font-medium ${
                  isActive ? 'text-hc-accent' : 'text-hc-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
