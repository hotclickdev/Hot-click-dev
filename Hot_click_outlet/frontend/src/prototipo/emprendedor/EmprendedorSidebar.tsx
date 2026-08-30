import {
  BellIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import PrototipoSidebarNav, { type GrupoNav, type ItemNav } from '@/prototipo/compartido/PrototipoSidebarNav'
import { RUTA_EMPRENDEDOR } from './constants'

const GRUPOS: readonly GrupoNav[] = [
  {
    titulo: 'Operar',
    items: [
      { to: RUTA_EMPRENDEDOR, etiqueta: 'Inicio', Icono: HomeIcon, end: true },
      { to: '/admin/pos', etiqueta: 'Caja (POS)', Icono: ComputerDesktopIcon, end: true },
      { to: `${RUTA_EMPRENDEDOR}/pedidos`, etiqueta: 'Pedidos', Icono: ClipboardDocumentListIcon },
    ],
  },
  {
    titulo: 'Inventario',
    items: [
      { to: `${RUTA_EMPRENDEDOR}/opciones/bodegas`, etiqueta: 'Mis Bodegas', Icono: BuildingStorefrontIcon },
      { to: `${RUTA_EMPRENDEDOR}/productos`, etiqueta: 'Mis Productos', Icono: CubeIcon },
    ],
  },
  {
    titulo: 'Negocio',
    items: [
      { to: `${RUTA_EMPRENDEDOR}/opciones/negocio`, etiqueta: 'Datos de tu Negocio', Icono: BuildingOffice2Icon, end: true },
      { to: `${RUTA_EMPRENDEDOR}/opciones/cobro`, etiqueta: 'Métodos de Cobro', Icono: CreditCardIcon, end: true },
      { to: `${RUTA_EMPRENDEDOR}/opciones/plan`, etiqueta: 'Tu Plan', Icono: SparklesIcon },
    ],
  },
]

const CUENTA: readonly ItemNav[] = [
  { to: `${RUTA_EMPRENDEDOR}/opciones/notificaciones`, etiqueta: 'Notificaciones', Icono: BellIcon, end: true },
  { to: `${RUTA_EMPRENDEDOR}/opciones/ayuda`, etiqueta: 'Ayuda y Soporte', Icono: QuestionMarkCircleIcon, end: true },
]

/**
 * Sidebar desktop Emprendimiento. Agrupa Operar / Inventario / Negocio.
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
      className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-hc-border bg-hc-surface px-3 py-6 md:flex"
      data-mm="emp-sidebar"
    >
      <div className="mb-2 flex items-center gap-2 px-2 pb-5 pt-1">
        <BrandLogo size={20} wordmarkSize={16} />
      </div>
      <PrototipoSidebarNav
        grupos={GRUPOS}
        cuenta={CUENTA}
        ariaLabel="Navegación emprendedor"
      />
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
