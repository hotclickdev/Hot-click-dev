import { NavLink, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

const NAV_BASE = [
  { segmento: 'productos', etiqueta: 'Productos' },
  { segmento: 'tienda', etiqueta: 'Tienda' },
  { segmento: 'reportes', etiqueta: 'Reportes' },
  { segmento: 'opciones', etiqueta: 'Opciones' },
] as const

/**
 * Sidebar desktop PYME / Negocio Plus (Figma 352:9086).
 * Negocio Plus agrega Sucursales en el menú.
 */
export default function SellerSidebar() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const userName = useAuthStore((s) => s.userName) ?? plan.usuario
  const logout = useAuthStore((s) => s.logout)
  const nav =
    plan.id === 'negocioPlus'
      ? [
          ...NAV_BASE.slice(0, 2),
          { segmento: 'sucursales', etiqueta: 'Sucursales' },
          ...NAV_BASE.slice(2),
        ]
      : [...NAV_BASE]

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-hc-border bg-hc-surface px-4 py-6 md:flex"
      aria-label="Navegación vendedor"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <BrandLogo size={22} wordmarkSize={17} />
      </div>
      <span className="mb-6 inline-flex w-fit rounded-[5px] bg-[var(--hc-danger-bg)] px-2.5 py-1 text-[10px] font-bold text-hc-primary">
        {plan.badge}
      </span>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.segmento}
            to={ruta(item.segmento)}
            className={({ isActive }) =>
              [
                'rounded-lg px-4 py-2.5 text-sm',
                isActive
                  ? 'bg-[var(--hc-danger-bg)] font-semibold text-hc-primary'
                  : 'font-normal text-hc-muted hover:bg-[var(--hc-n-50)]',
              ].join(' ')
            }
          >
            {item.etiqueta}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 border-t border-hc-border pt-4">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-hc-primary text-xs font-bold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-hc-text">{userName}</p>
            <p className="truncate text-[10px] text-hc-muted">{plan.planLabel}</p>
          </div>
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
