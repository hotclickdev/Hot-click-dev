import { NavLink } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import iconProductos from './assets/icon-productos.svg'
import iconProductosActivo from './assets/icon-productos-activo.svg'
import iconTienda from './assets/icon-tienda.svg'
import iconTiendaActivo from './assets/icon-tienda-activo.svg'
import iconOpciones from './assets/icon-opciones.svg'
import iconOpcionesActivo from './assets/icon-opciones-activo.svg'

type Tab =
  | { segmento: ''; label: 'Menú Principal'; tipo: 'menu' }
  | { segmento: 'productos'; label: 'Productos'; tipo: 'img'; idle: string; activo: string }
  | { segmento: 'tienda'; label: 'Tienda'; tipo: 'img'; idle: string; activo: string }
  | { segmento: 'reportes'; label: 'Reportes'; tipo: 'reportes' }
  | { segmento: 'opciones'; label: 'Opciones'; tipo: 'img'; idle: string; activo: string }

const TABS: Tab[] = [
  { segmento: 'productos', label: 'Productos', tipo: 'img', idle: iconProductos, activo: iconProductosActivo },
  { segmento: 'tienda', label: 'Tienda', tipo: 'img', idle: iconTienda, activo: iconTiendaActivo },
  { segmento: '', label: 'Menú Principal', tipo: 'menu' },
  { segmento: 'reportes', label: 'Reportes', tipo: 'reportes' },
  { segmento: 'opciones', label: 'Opciones', tipo: 'img', idle: iconOpciones, activo: iconOpcionesActivo },
]

/**
 * Bottom nav PYME / Negocio Plus — Menú Principal al centro.
 */
export default function SellerBottomNav() {
  const ruta = useSellerRuta()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
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
                    className={`max-w-full px-0.5 text-center text-[8px] leading-tight ${
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
  const src = activo ? tab.activo : tab.idle
  return (
    <span className="relative block size-[22px] overflow-clip">
      <img src={src} alt="" width={22} height={22} className="size-full" />
    </span>
  )
}

function IconoMenu({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-[#8C8C8C]'
  return (
    <span className="relative block size-[22px]" aria-hidden>
      <span className={`absolute left-1/2 top-[3px] size-[8px] -translate-x-1/2 rounded-full ${color}`} />
      <span className={`absolute bottom-[3px] left-1/2 h-[7px] w-[14px] -translate-x-1/2 rounded-t-[3px] ${color}`} />
    </span>
  )
}

function IconoReportes({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-[#8C8C8C]'
  return (
    <span className="relative block size-[22px] overflow-clip" aria-hidden>
      <span className={`absolute left-[3px] top-[12px] h-[7px] w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[9px] top-[7px] h-3 w-1 rounded-[1px] ${color}`} />
      <span className={`absolute left-[15px] top-[3px] h-4 w-1 rounded-[1px] ${color}`} />
    </span>
  )
}
