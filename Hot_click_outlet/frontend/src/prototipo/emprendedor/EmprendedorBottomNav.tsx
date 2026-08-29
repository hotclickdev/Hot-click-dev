import iconProductos from './assets/icon-productos.svg'
import iconProductosActivo from './assets/icon-productos-activo.svg'
import iconTienda from './assets/icon-tienda.svg'
import iconTiendaActivo from './assets/icon-tienda-activo.svg'
import iconOpciones from './assets/icon-opciones.svg'
import iconOpcionesActivo from './assets/icon-opciones-activo.svg'
import { NavLink } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from './constants'

type Item =
  | { to: string; label: 'Menú Principal'; tipo: 'menu'; end: true }
  | { to: string; label: 'Productos'; tipo: 'img'; icon: string; iconActivo: string; end?: false }
  | { to: string; label: 'Tienda'; tipo: 'img'; icon: string; iconActivo: string; end?: false }
  | { to: string; label: 'Reportes'; tipo: 'reportes'; end?: false }
  | { to: string; label: 'Opciones'; tipo: 'img'; icon: string; iconActivo: string; end?: false }

const ITEMS: Item[] = [
  { to: `${RUTA_EMPRENDEDOR}/productos`, label: 'Productos', tipo: 'img', icon: iconProductos, iconActivo: iconProductosActivo },
  { to: `${RUTA_EMPRENDEDOR}/tienda`, label: 'Tienda', tipo: 'img', icon: iconTienda, iconActivo: iconTiendaActivo },
  { to: RUTA_EMPRENDEDOR, label: 'Menú Principal', tipo: 'menu', end: true },
  { to: `${RUTA_EMPRENDEDOR}/reportes`, label: 'Reportes', tipo: 'reportes' },
  { to: `${RUTA_EMPRENDEDOR}/opciones`, label: 'Opciones', tipo: 'img', icon: iconOpciones, iconActivo: iconOpcionesActivo },
]

/**
 * Bottom nav Emprendedor — Menú Principal al centro.
 */
export default function EmprendedorBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface"
      aria-label="Navegación emprendedor"
    >
      <ul className="grid grid-cols-5 px-1 py-2">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end === true}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5"
            >
              {({ isActive }) => (
                <>
                  <IconoTab item={item} activo={isActive} />
                  <span
                    className={`max-w-full px-0.5 text-center text-[8px] leading-tight ${
                      isActive ? 'font-bold text-hc-primary' : 'font-medium text-hc-muted'
                    }`}
                  >
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

function IconoTab({ item, activo }: { item: Item; activo: boolean }) {
  if (item.tipo === 'menu') return <IconoMenu activo={activo} />
  if (item.tipo === 'reportes') return <IconReportes activo={activo} />
  const src = activo ? item.iconActivo : item.icon
  return (
    <span className="size-[22px] overflow-hidden">
      <img src={src} alt="" width={22} height={22} className="size-full" />
    </span>
  )
}

function IconoMenu({ activo }: { activo: boolean }) {
  const color = activo ? 'bg-hc-primary' : 'bg-[var(--hc-n-400)]'
  return (
    <span className="relative block size-[22px]" aria-hidden>
      <span className={`absolute left-1/2 top-[3px] size-[8px] -translate-x-1/2 rounded-full ${color}`} />
      <span className={`absolute bottom-[3px] left-1/2 h-[7px] w-[14px] -translate-x-1/2 rounded-t-[3px] ${color}`} />
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
