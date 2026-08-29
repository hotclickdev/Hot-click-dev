import { NavLink, useLocation } from 'react-router-dom'
import iconConfig from './assets/nav-config.svg?raw'
import iconModeracion from './assets/nav-moderacion.svg?raw'
import iconTiendas from './assets/nav-tiendas.svg?raw'
import iconUsuarios from './assets/nav-usuarios.svg?raw'

const ITEMS = [
  {
    to: '/admin',
    label: 'Tiendas',
    icon: iconTiendas,
    activa: (path: string) => path === '/admin' || path.startsWith('/admin/empresas'),
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: iconUsuarios,
    activa: (path: string) => path.startsWith('/admin/usuarios'),
  },
  {
    to: '/admin/aprobaciones',
    label: 'Moderación',
    icon: iconModeracion,
    activa: (path: string) => path.startsWith('/admin/aprobaciones'),
  },
  {
    to: '/admin/configuracion',
    label: 'Config',
    icon: iconConfig,
    activa: (path: string) => path.startsWith('/admin/configuracion'),
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
 * Bottom nav Super Admin (Figma 43:150) sobre `/admin` real.
 */
export default function AdminBottomNav() {
  const { pathname } = useLocation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-hc-border bg-hc-surface md:hidden"
      aria-label="Navegación admin"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-5 py-2">
        {ITEMS.map((item) => {
          const activa = item.activa(pathname)
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/admin'}
                data-mm={item.to === '/admin/aprobaciones' ? 'nav-moderacion' : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[9px] ${
                  activa
                    ? 'font-bold text-hc-primary [&_svg]:text-hc-primary'
                    : 'font-medium text-[var(--hc-text-disabled,#9AA1AE)] [&_svg]:text-[var(--hc-text-disabled,#9AA1AE)]'
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
