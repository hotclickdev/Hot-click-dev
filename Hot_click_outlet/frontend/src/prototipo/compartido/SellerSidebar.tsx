import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CubeIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import { useEncargosPendientesCount } from '@/features/encargos/useEncargos'
import NegocioPertenenciaChip from './NegocioPertenenciaChip'
import PrototipoSidebarNav, { type GrupoNav, type ItemNav } from './PrototipoSidebarNav'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import type { PlanConfig } from './plan'

function itemPlanExtra(ruta: (segmento?: string) => string, plan: PlanConfig): ItemNav {
  const esPlus = plan.id === 'negocioPlus'
  return {
    to: ruta(plan.extraOpcion.to),
    etiqueta: esPlus ? 'Sucursales' : 'Equipo',
    Icono: esPlus ? BuildingOffice2Icon : UserGroupIcon,
  }
}

function gruposSeller(
  ruta: (segmento?: string) => string,
  plan: PlanConfig,
  pendientesEncargos: number,
): GrupoNav[] {
  const extra = plan.id === 'emprendedor' ? [] : [itemPlanExtra(ruta, plan)]
  return [
    {
      titulo: 'Operar',
      items: [
        { to: '/admin/pos', etiqueta: 'Caja (POS)', Icono: ComputerDesktopIcon, end: true },
        { to: ruta('pedidos'), etiqueta: 'Pedidos', Icono: ClipboardDocumentListIcon },
        { to: ruta('tienda'), etiqueta: 'Tienda', Icono: BuildingStorefrontIcon },
        { to: ruta('recoleccion'), etiqueta: 'Recolección', Icono: TruckIcon },
        {
          to: ruta('encargos'),
          etiqueta: 'Encargos',
          Icono: ClipboardDocumentListIcon,
          badge: pendientesEncargos,
        },
        ...extra,
      ],
    },
    {
      titulo: 'Inventario',
      items: [
        { to: ruta('bodegas'), etiqueta: 'Mis Bodegas', Icono: BuildingStorefrontIcon },
        { to: ruta('productos'), etiqueta: 'Mis Productos', Icono: CubeIcon },
      ],
    },
    {
      titulo: 'Negocio',
      items: [
        { to: ruta('reportes'), etiqueta: 'Reportes', Icono: ChartBarIcon },
        { to: ruta('opciones'), etiqueta: 'Opciones', Icono: Cog6ToothIcon },
      ],
    },
  ]
}

/**
 * Sidebar desktop PYME / Negocio Plus. Misma descubribilidad base que Emp
 * (POS, Pedidos, Bodegas); extras de plan: Equipo (PYME) / Sucursales (Plus).
 */
export default function SellerSidebar() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const userName = useAuthStore((s) => s.userName) ?? plan.usuario
  const logout = useAuthStore((s) => s.logout)
  const { data: pendientesEncargos = 0 } = useEncargosPendientesCount()
  const grupos = useMemo(
    () => gruposSeller(ruta, plan, pendientesEncargos),
    [ruta, plan, pendientesEncargos],
  )

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-hc-border bg-hc-surface px-3 py-6 md:flex"
    >
      <div className="mb-3 flex items-center gap-2 px-2">
        <BrandLogo size={22} wordmarkSize={17} />
      </div>
      <span className="mb-5 ml-2 inline-flex w-fit rounded-[5px] bg-[var(--hc-danger-bg)] px-2.5 py-1 text-[10px] font-bold text-hc-primary">
        {plan.badge}
      </span>
      <NegocioPertenenciaChip variante="card" className="mb-4" />
      <PrototipoSidebarNav grupos={grupos} ariaLabel="Navegación vendedor" />
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
