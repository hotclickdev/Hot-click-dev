import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, CubeIcon, ShoppingBagIcon, TruckIcon } from '@heroicons/react/24/outline'
import { useEncargosPendientesCount } from '@/features/encargos/useEncargos'
import { rutaConPrefijo } from '@/utils/planPaths'
import OnboardingPrimeraVez from './OnboardingPrimeraVez'
import { PARAM_FILTRO_PEDIDOS } from './pedidosListaHelpers'
import { useKpisInicio } from './useKpisInicio'
import { usePedidosPorDespachar } from './usePedidosPorDespachar'

type Props = Readonly<{
  /** Prefijo del panel del plan: `/emprendedor`, `/pyme` o `/negocio-plus`. */
  base: string
  /** Rol para la bienvenida de primera visita. */
  rol: string
}>

function textoPedidos(cantidad: number): string {
  // TODO copy Producto
  return cantidad === 1 ? '1 pedido' : `${cantidad} pedidos`
}

function TarjetaPorDespachar({ base }: { base: string }) {
  const { t } = useTranslation()
  const { data: cantidad, isPending, isError, refetch } = usePedidosPorDespachar()

  if (isPending) {
    return <div aria-busy="true" aria-label="Revisando tus pedidos" className="mt-4 h-[148px] animate-pulse rounded-[16px] bg-hc-surface-2" />
  }
  if (isError) {
    return (
      <section className="mt-4 rounded-[16px] border border-hc-border bg-hc-surface p-4" role="alert">
        {/* TODO copy Producto */}
        <p className="text-sm text-hc-text">No pudimos revisar tus pedidos.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface text-[15px] font-semibold text-hc-text"
        >
          {t('comun.reintentar', { defaultValue: 'Reintentar' })}
        </button>
      </section>
    )
  }
  if (!cantidad) return null

  return (
    <section aria-labelledby="inicio-por-despachar" className="mt-4 rounded-[16px] border border-hc-border bg-hc-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--hc-info-bg)] text-[var(--hc-info)]">
          <TruckIcon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="inicio-por-despachar" className="text-[13px] font-semibold text-hc-muted">{t('despacho.porDespachar')}</h2>
          <p className="font-display text-xl font-bold text-hc-text">{textoPedidos(cantidad)}</p>
        </div>
      </div>
      <Link
        to={`${rutaConPrefijo(base, 'pedidos')}?${PARAM_FILTRO_PEDIDOS}=pendientes`}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-hc-primary text-[15px] font-bold text-white"
      >
        {/* La clave inicio.porDespachar.boton todavía no existe en los idiomas; el texto de respaldo es provisorio. */}
        {t('inicio.porDespachar.boton', { defaultValue: 'Despachar' })}
      </Link>
    </section>
  )
}

function FilaAtajo({ to, etiqueta, badge }: { to: string; etiqueta: string; badge?: number }) {
  return (
    <li className="border-b border-hc-border last:border-b-0">
      <Link to={to} className="flex min-h-[52px] items-center justify-between gap-3 px-4 text-[15px] font-medium text-hc-text">
        <span className="flex items-center gap-2">
          {etiqueta}
          {badge && badge > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-hc-primary px-1.5 text-[11px] font-bold text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </span>
        <ChevronRightIcon className="size-5 text-hc-muted" aria-hidden />
      </Link>
    </li>
  )
}

/**
 * Inicio en celular: empieza por lo de hoy («Por despachar», con la única CTA roja) y deja
 * Encargos y Recolección a un toque, porque ya no tienen botón grande ni lugar en la barra inferior.
 */
export default function InicioMovil({ base, rol }: Props) {
  const { data: encargosPendientes = 0 } = useEncargosPendientesCount()
  return (
    <div className="px-5 pb-8 pt-5 md:hidden">
      {/* TODO copy Producto */}
      <h1 className="font-display text-[22px] font-bold text-hc-text">Inicio</h1>
      <TarjetaPorDespachar base={base} />
      <KpisInicio base={base} />
      <div className="mt-4">
        <OnboardingPrimeraVez rol={rol} />
      </div>
      <ul className="overflow-hidden rounded-[16px] border border-hc-border bg-hc-surface">
        <FilaAtajo to={rutaConPrefijo(base, 'encargos')} etiqueta="Encargos" badge={encargosPendientes} />
        <FilaAtajo to={rutaConPrefijo(base, 'recoleccion')} etiqueta="Recolección y entrega" />
      </ul>
    </div>
  )
}

function KpisInicio({ base }: { base: string }) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useKpisInicio()

  if (isPending) {
    return <div aria-busy="true" aria-label="Revisando el día" className="mt-3 grid grid-cols-2 gap-3">
      <div className="h-[88px] animate-pulse rounded-[16px] bg-hc-surface-2" />
      <div className="h-[88px] animate-pulse rounded-[16px] bg-hc-surface-2" />
    </div>
  }
  if (isError || !data) return null

  return (
    <ul className="mt-3 grid grid-cols-2 gap-3">
      <li>
        <KpiCard
          to={rutaConPrefijo(base, 'pedidos')}
          icono={<ShoppingBagIcon className="size-5" aria-hidden />}
          valor={data.pedidosHoy}
          etiqueta={t('admin.dashboard.ordersToday')}
        />
      </li>
      <li>
        <KpiCard
          to={rutaConPrefijo(base, 'productos')}
          icono={<CubeIcon className="size-5" aria-hidden />}
          valor={data.stockBajo}
          etiqueta={t('admin.dashboard.lowStock')}
        />
      </li>
    </ul>
  )
}

function KpiCard({ to, icono, valor, etiqueta }: { to: string; icono: ReactNode; valor: number; etiqueta: string }) {
  return (
    <Link to={to} className="flex min-h-[88px] flex-col justify-between rounded-[16px] border border-hc-border bg-hc-surface p-3">
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--hc-info-bg)] text-[var(--hc-info)]">
        {icono}
      </span>
      <span>
        <span className="block font-display text-xl font-bold leading-none text-hc-text">{valor}</span>
        <span className="mt-1 block text-[12px] leading-[16px] text-hc-muted">{etiqueta}</span>
      </span>
    </Link>
  )
}
