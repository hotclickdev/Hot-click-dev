import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { useEncargosKpis } from '@/features/encargos/useEncargos'
import type { EncargoKpis } from '@/services/encargoService'
import { Chip, EncabezadoPagina, Miniatura } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useReportesVendedor } from './useReportesVendedor'
import EntradaPagina from './motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Todo'] as const

/**
 * Reportes del vendedor (Figma 61:270) — catálogo y pedidos reales.
 */
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>('Todo')
  const ruta = useSellerRuta()
  const { publicados, unidadesVendidas, gananciaVendida, gananciaPotencial, top, cargando, error } = useReportesVendedor()
  const { data: encargosKpis } = useEncargosKpis()
  const conversionEncargos = conversionCotizacionPago(encargosKpis)
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px]" data-mm="seller-reportes">
        <EncabezadoPagina titulo="Reportes" subtitulo="Resumen de tu negocio" />
        <ListaStagger className="mb-4 flex gap-2">
          {PERIODOS.map((item) => (
            <ItemListaStagger key={item}>
              <Chip activo={periodo === item} onClick={() => setPeriodo(item)}>{item}</Chip>
            </ItemListaStagger>
          ))}
        </ListaStagger>
        {cargando ? <p className="mb-3 text-sm text-hc-muted">Cargando reportes…</p> : null}
        {error ? <p className="mb-3 text-sm text-hc-danger">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Kpi titulo="Productos publicados" valor={String(publicados)} />
          <Kpi titulo="Vendidos" valor={String(unidadesVendidas)} />
          <Kpi titulo="Ganancia vendida" valor={formatoColon(gananciaVendida)} />
          <Kpi titulo="Ganancia potencial" valor={formatoColon(gananciaPotencial)} />
        </div>
        {encargosKpis ? (
          <section className="mt-6 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold">Encargos personalizados</h2>
              <Link to={ruta('encargos')} className="text-xs font-semibold text-hc-primary">
                Ver encargos
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi titulo="Pendientes de cotizar" valor={String(encargosKpis.pendientes)} destacado={encargosKpis.pendientes > 0} />
              <Kpi titulo="Por pagar" valor={String(encargosKpis.pendientePago)} />
              <Kpi titulo="Pagados" valor={String(encargosKpis.pagados)} />
              <Kpi
                titulo="Conversión cotización → pago"
                valor={conversionEncargos != null ? `${conversionEncargos}%` : '—'}
              />
            </div>
            <p className="text-[11px] text-hc-muted">
              Ticket promedio cotizado: {formatoColon(encargosKpis.ticketPromedioCotizado || 0)}
            </p>
          </section>
        ) : null}
        <h2 className="mb-3 mt-6 text-[15px] font-bold">Más vendidos</h2>
        {top.length === 0 && !cargando ? (
          <p className="text-sm text-hc-muted">Todavía no hay ventas para mostrar.</p>
        ) : null}
        <ListaStagger className="space-y-4">
          {top.map((item) => (
            <ItemListaStagger key={item.nombre} className="flex items-center gap-3">
              <Miniatura className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.nombre}</p>
                <p className="text-xs text-hc-muted">{item.vendidos} vendidos</p>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--hc-success-bg)' }}>
                {formatoColon(item.total)}
              </span>
            </ItemListaStagger>
          ))}
        </ListaStagger>
      </main>
    </EntradaPagina>
  )
}

function Kpi({ titulo, valor, destacado = false }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-xl p-3.5 ${destacado ? 'bg-[var(--hc-red-50)]' : 'bg-hc-surface-2'}`}>
      <p className="text-xs text-hc-muted">{titulo}</p>
      <p className={`mt-1 text-xl font-bold ${destacado ? 'text-hc-primary' : ''}`}>{valor}</p>
    </div>
  )
}

function conversionCotizacionPago(kpis: EncargoKpis | null | undefined): number | null {
  if (!kpis) return null
  const cotizados = kpis.aprobados + kpis.pendientePago + kpis.pagados + kpis.vencidos
  if (cotizados === 0) return null
  return Math.round((kpis.pagados / cotizados) * 100)
}
