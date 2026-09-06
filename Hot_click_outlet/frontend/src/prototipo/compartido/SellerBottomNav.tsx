import { NavLink } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import iconProductos from './assets/icon-productos.svg?raw'
import iconTienda from './assets/icon-tienda.svg?raw'
import iconOpciones from './assets/icon-opciones.svg?raw'

type Tab =
  | { segmento: ''; label: 'Menú Principal'; tipo: 'menu' }
  | { segmento: 'productos'; label: 'Productos'; tipo: 'img'; icon: string }
  | { segmento: 'tienda'; label: 'Tienda'; tipo: 'img'; icon: string }
  | { segmento: 'reportes'; label: 'Reportes'; tipo: 'reportes' }
  | { segmento: 'opciones'; label: 'Opciones'; tipo: 'img'; icon: string }

const TABS: Tab[] = [
  { segmento: 'productos', label: 'Productos', tipo: 'img', icon: iconProductos },
  { segmento: 'tienda', label: 'Tienda', tipo: 'img', icon: iconTienda },
  { segmento: '', label: 'Menú Principal', tipo: 'menu' },
  { segmento: 'reportes', label: 'Reportes', tipo: 'reportes' },
  { segmento: 'opciones', label: 'Opciones', tipo: 'img', icon: iconOpciones },
]

/**
 * Bottom nav PYME / Negocio Plus — Menú Principal al centro.
 */
export default function SellerBottomNav() {
  const ruta = useSellerRuta()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegación del vendedor"
    >
      <ul className="grid grid-cols-5 px-1 py-2">
        {TABS.map((tab) => (
          <li key={tab.label}>
            <NavLink
              to={ruta(tab.segmento)}
              end={tab.tipo === 'menu'}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5"
            >
              {({ isActive }) => (
                <>
                  <IconoTab tab={tab} activo={isActive} />
                  <span
                    className={`max-w-full px-0.5 text-center text-[11px] leading-tight ${
                      isActive ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function IconoTab({ tab, activo }: { tab: Tab; activo: boolean }) {
  if (tab.tipo === 'menu') return <IconoMenu activo={activo} />
  if (tab.tipo === 'reportes') return <IconoReportes activo={activo} />
  return (
    <span
      className={`relative block size-[22px] overflow-clip [&_svg]:size-full ${
        activo ? 'text-hc-primary' : 'text-hc-muted'
      }`}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: tab.icon }}
    />
  )
}

function IconoMenu({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-hc-muted'
  return (
    <span className="relative block size-[22px]" aria-hidden>
      <span className={`absolute left-1/2 top-[3px] size-[8px] -translate-x-1/2 rounded-full ${color}`} />
      <span className={`absolute bottom-[3px] left-1/2 h-[7px] w-[14px] -translate-x-1/2 rounded-t-[3px] ${color}`} />
    </span>
  )
}

function IconoReportes({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-hc-muted'
  return (
    <span className="relative block size-[22px] overflow-clip" aria-hidden>
      <span className={`absolute left-[3px] top-[12px] h-[7px] w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[9px] top-[7px] h-3 w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[15px] top-[3px] h-4 w-1 rounded-[1px] ${color}`} />
    </span>
  )
}
