import { NavLink, useLocation } from 'react-router-dom'
import iconConfig from './assets/nav-config.svg?raw'
import iconModeracion from './assets/nav-moderacion.svg?raw'
import iconTiendas from './assets/nav-tiendas.svg?raw'
import iconUsuarios from './assets/nav-usuarios.svg?raw'

const ITEMS = [
  {
    to: '/prototipo/admin/dashboard',
    label: 'Tiendas',
    icon: iconTiendas,
    activa: (path: string) => path.endsWith('/dashboard') || path.endsWith('/tiendas'),
  },
  {
    to: '/prototipo/admin/usuarios',
    label: 'Usuarios',
    icon: iconUsuarios,
    activa: (path: string) => path.endsWith('/usuarios'),
  },
  {
    to: '/prototipo/admin/moderacion',
    label: 'Moderación',
    icon: iconModeracion,
    activa: (path: string) => path.endsWith('/moderacion'),
  },
  {
    to: '/prototipo/admin/config',
    label: 'Config',
    icon: iconConfig,
    activa: (path: string) => path.endsWith('/config'),
  },
] as const

function NavGlyph({ svg }: { svg: string }) {
  return (
    <span
      className="block size-[22px] overflow-clip [&_svg]:size-full"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/**
 * Bottom nav del prototipo Super Admin (Figma 43:150).
 */
export default function AdminBottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-hc-border bg-hc-surface"
      aria-label="Navegación admin"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-5 py-2">
        {ITEMS.map((item) => {
          const activa = item.activa(pathname)
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[9px] ${
                  activa ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'
                }`}
              >
                <NavGlyph svg={item.icon} />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
