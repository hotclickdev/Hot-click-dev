import iconProductos from './assets/icon-productos.svg'
import iconProductosActivo from './assets/icon-productos-activo.svg'
import iconTienda from './assets/icon-tienda.svg'
import iconTiendaActivo from './assets/icon-tienda-activo.svg'
import iconOpciones from './assets/icon-opciones.svg'
import iconOpcionesActivo from './assets/icon-opciones-activo.svg'
import { NavLink } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from './constants'

const ITEMS = [
  { to: `${RUTA_EMPRENDEDOR}/productos`, label: 'Productos', icon: iconProductos, iconActivo: iconProductosActivo },
  { to: `${RUTA_EMPRENDEDOR}/tienda`, label: 'Tienda', icon: iconTienda, iconActivo: iconTiendaActivo },
  { to: `${RUTA_EMPRENDEDOR}/reportes`, label: 'Reportes', icon: '', iconActivo: '' },
  { to: `${RUTA_EMPRENDEDOR}/opciones`, label: 'Opciones', icon: iconOpciones, iconActivo: iconOpcionesActivo },
] as const

/**
 * Bottom nav Figma «Componente / Bottom Nav» (24:2).
 */
export default function EmprendedorBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
      aria-label="Navegación emprendedor"
    >
      <ul className="grid grid-cols-4 px-1 py-2">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5"
            >
              {({ isActive }) => (
                <>
                  <IconoTab item={item} activo={isActive} />
                  <span className={`text-[9px] ${isActive ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'}`}>
                    {item.label}
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

function IconoTab({ item, activo }: { item: (typeof ITEMS)[number]; activo: boolean }) {
  if (item.label === 'Reportes') return <IconReportes activo={activo} />
  const src = activo ? item.iconActivo : item.icon
  return (
    <span className="size-[22px] overflow-hidden">
      <img src={src} alt="" width={22} height={22} className="size-full" />
    </span>
  )
}

function IconReportes({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-[var(--hc-n-400)]'
  return (
    <span className="relative block size-[22px] overflow-hidden" aria-hidden>
      <span className={`absolute left-[3px] top-3 h-[7px] w-1 rounded-sm ${color}`} />
      <span className={`absolute left-[9px] top-[7px] h-3 w-1 rounded-sm ${color}`} />
      <span className={`absolute left-[15px] top-[3px] h-4 w-1 rounded-sm ${color}`} />
    </span>
  )
}
