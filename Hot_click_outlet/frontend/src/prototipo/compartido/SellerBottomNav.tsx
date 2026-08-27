import { NavLink } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import iconProductos from './assets/icon-productos.svg'
import iconProductosActivo from './assets/icon-productos-activo.svg'
import iconTienda from './assets/icon-tienda.svg'
import iconTiendaActivo from './assets/icon-tienda-activo.svg'
import iconOpciones from './assets/icon-opciones.svg'
import iconOpcionesActivo from './assets/icon-opciones-activo.svg'

const TABS = [
  { segmento: 'productos', label: 'Productos', idle: iconProductos, activo: iconProductosActivo },
  { segmento: 'tienda', label: 'Tienda', idle: iconTienda, activo: iconTiendaActivo },
  { segmento: 'reportes', label: 'Reportes' },
  { segmento: 'opciones', label: 'Opciones', idle: iconOpciones, activo: iconOpcionesActivo },
] as const

/**
 * Bottom nav del vendedor PYME / Negocio Plus (Figma 61:602).
 */
export default function SellerBottomNav() {
  const ruta = useSellerRuta()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
      aria-label="Navegación del vendedor"
    >
      <ul className="grid grid-cols-4 px-2 py-2">
        {TABS.map((tab) => (
          <li key={tab.segmento}>
            <NavLink
              to={ruta(tab.segmento)}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5"
            >
              {({ isActive }) => (
                <>
                  <IconoTab tab={tab} activo={isActive} />
                  <span className={`text-[9px] ${isActive ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'}`}>
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

function IconoTab({ tab, activo }: { tab: (typeof TABS)[number]; activo: boolean }) {
  if (tab.segmento === 'reportes') {
    return <IconoReportes activo={activo} />
  }
  const src = activo ? tab.activo : tab.idle
  return (
    <span className="relative block size-[22px] overflow-clip">
      <img src={src} alt="" width={22} height={22} className="size-full" />
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
