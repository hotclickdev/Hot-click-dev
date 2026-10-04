import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  EllipsisHorizontalIcon,
  HomeIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import useTenantStore from '@/store/tenantStore'
import HojaMasPanel from './HojaMasPanel'
import {
  esInicio,
  esRutaDeMas,
  pathEstaEnRuta,
  RUTA_CAJA_POS,
  rutasBarra,
} from './panelNavegacionMovil'
import { usePedidosPorDespachar } from './usePedidosPorDespachar'

type Props = Readonly<{
  base: string
  planApi: string
  ariaLabel: string
}>

const CLASE_ITEM = 'relative flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 touch-manipulation'
const ICONO = 'size-[22px]'

function claseEtiqueta(activo: boolean): string {
  return `max-w-full px-0.5 text-center text-[11px] leading-tight ${activo ? 'font-bold text-[var(--hc-info)]' : 'font-medium text-hc-muted'}`
}

function claseColor(activo: boolean): string {
  return activo ? 'text-[var(--hc-info)]' : 'text-hc-muted'
}

/** Badge de Pedidos: solo aparece con una cantidad real mayor que cero. */
function BadgeCantidad({ cantidad }: { cantidad: number | undefined }) {
  if (!cantidad || cantidad <= 0) return null
  return (
    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-hc-primary px-1 text-[10px] font-bold leading-none text-white">
      {cantidad > 99 ? '99+' : cantidad}
    </span>
  )
}

function ItemEnlace({ to, activo, etiqueta, icono, badge, dataMm }: {
  to: string
  activo: boolean
  etiqueta: string
  icono: ReactNode
  badge?: ReactNode
  dataMm?: string
}) {
  return (
    <li>
      <Link to={to} aria-current={activo ? 'page' : undefined} data-mm={dataMm} className={CLASE_ITEM}>
        <span className={`relative ${claseColor(activo)}`}>
          {icono}
          {badge}
        </span>
        <span className={claseEtiqueta(activo)}>{etiqueta}</span>
      </Link>
    </li>
  )
}

/**
 * Barra inferior del panel del vendedor en celular: Inicio, Pedidos, Productos, Caja y Más.
 * Caja solo existe en los planes con POS; sin POS no se dibuja ni un botón bloqueado.
 */
export default function PanelBarraInferior({ base, planApi, ariaLabel }: Props) {
  const { pathname } = useLocation()
  const [masAbierto, setMasAbierto] = useState(false)
  const tienePos = useTenantStore((s) => s.hasFeature('pos'))
  const { data: porDespachar } = usePedidosPorDespachar()
  const rutas = rutasBarra(base)
  const masActivo = masAbierto || esRutaDeMas(pathname, base, planApi)
  const columnas = tienePos ? 5 : 4

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md border-t border-hc-border bg-hc-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid px-1" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          <ItemEnlace
            to={rutas.inicio}
            activo={esInicio(pathname, base)}
            etiqueta="Inicio"
            icono={<HomeIcon className={ICONO} aria-hidden />}
          />
          <ItemEnlace
            to={rutas.pedidos}
            activo={pathEstaEnRuta(pathname, rutas.pedidos)}
            etiqueta="Pedidos"
            icono={<ClipboardDocumentListIcon className={ICONO} aria-hidden />}
            badge={<BadgeCantidad cantidad={porDespachar} />}
            dataMm="seller-menu-pedidos"
          />
          <ItemEnlace
            to={rutas.productos}
            activo={pathEstaEnRuta(pathname, rutas.productos)}
            etiqueta="Productos"
            icono={<CubeIcon className={ICONO} aria-hidden />}
            dataMm="seller-menu-productos"
          />
          {tienePos ? (
            <ItemEnlace
              to={RUTA_CAJA_POS}
              activo={false}
              etiqueta="Caja"
              icono={<WalletIcon className={ICONO} aria-hidden />}
              dataMm="seller-menu-pos"
            />
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => setMasAbierto(true)}
              aria-haspopup="dialog"
              aria-expanded={masAbierto}
              className={CLASE_ITEM}
            >
              <span className={claseColor(masActivo)}>
                <EllipsisHorizontalIcon className={ICONO} aria-hidden />
              </span>
              <span className={claseEtiqueta(masActivo)}>Más</span>
            </button>
          </li>
        </ul>
      </nav>
      <HojaMasPanel abierta={masAbierto} onCerrar={() => setMasAbierto(false)} base={base} planApi={planApi} />
    </>
  )
}
