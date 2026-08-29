import { NavLink, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import { RUTA_EMPRENDEDOR } from './constants'

const NAV = [
  { to: RUTA_EMPRENDEDOR, etiqueta: 'Inicio', end: true },
  { to: '/admin/pos', etiqueta: 'Caja (POS)', end: true },
  { to: `${RUTA_EMPRENDEDOR}/pedidos`, etiqueta: 'Pedidos', end: false },
  { to: `${RUTA_EMPRENDEDOR}/opciones/bodegas`, etiqueta: 'Mis Bodegas', end: false },
  { to: `${RUTA_EMPRENDEDOR}/productos`, etiqueta: 'Mis Productos', end: false },
  { to: `${RUTA_EMPRENDEDOR}/opciones/negocio`, etiqueta: 'Datos de tu Negocio', end: true },
  { to: `${RUTA_EMPRENDEDOR}/opciones/cobro`, etiqueta: 'Métodos de Cobro', end: true },
  { to: `${RUTA_EMPRENDEDOR}/opciones/plan`, etiqueta: 'Tu Plan', end: false },
  { to: `${RUTA_EMPRENDEDOR}/opciones/notificaciones`, etiqueta: 'Notificaciones', end: true },
  { to: `${RUTA_EMPRENDEDOR}/opciones/ayuda`, etiqueta: 'Ayuda y Soporte', end: true },
] as const

/**
 * Sidebar desktop Emprendimiento (Figma Componente / Sidebar 352:3421).
 */
export default function EmprendedorSidebar() {
  const navigate = useNavigate()
  const userName = useAuthStore((s) => s.userName) ?? 'Emprendedor'
  const logout = useAuthStore((s) => s.logout)

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col gap-1 border-r border-hc-border bg-hc-surface px-4 py-6 md:flex"
      aria-label="Navegación emprendedor"
      data-mm="emp-sidebar"
    >
      <div className="mb-2 flex items-center gap-2 px-2 pb-6 pt-1">
        <BrandLogo size={20} wordmarkSize={16} />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-hc-text',
                isActive ? 'bg-[var(--hc-n-50)] font-semibold' : 'hover:bg-[var(--hc-n-50)]',
              ].join(' ')
            }
          >
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--hc-n-400)]" aria-hidden />
            {item.etiqueta}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 border-t border-hc-border pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hc-primary text-xs font-bold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-hc-text">{userName}</p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-hc-danger hover:bg-[var(--hc-danger-bg)]"
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </aside>
  )
}
