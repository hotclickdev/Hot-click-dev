import { formatoColon } from '@/theme/formatoColon'
import { Chip } from '@/prototipo/compartido/ui'
import Miniatura from '../ui/Miniatura'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReportesVendedor } from '@/prototipo/compartido/useReportesVendedor'
import { useEncargosKpis } from '@/features/encargos/useEncargos'
import type { EncargoKpis } from '@/services/encargoService'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import { RUTA_EMPRENDEDOR } from '../constants'

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Todo'] as const

/**
 * Paso 4 Reportes (Figma 13:2) — números reales del catálogo y pedidos.
 */
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>('Todo')
  const { publicados, unidadesVendidas, gananciaVendida, gananciaPotencial, top, cargando, error } = useReportesVendedor()
  const { data: encargosKpisRaw } = useEncargosKpis()
  const encargosKpis = encargosKpisRaw as EncargoKpis | undefined
  const conversionEncargos = conversionCotizacionPago(encargosKpis)

  return (
    <EntradaPagina>
      <main className="flex flex-col gap-[22px] px-5 pt-8" data-mm="seller-reportes">
        <header>
          <h1 className="font-display text-[22px] font-bold">Reportes</h1>
          <p className="text-xs text-hc-muted">Resumen de tu negocio</p>
        </header>
        <ListaStagger className="flex gap-2 overflow-x-auto">
          {PERIODOS.map((opcion) => (
            <ItemListaStagger key={opcion}>
              <Chip activo={periodo === opcion} onClick={() => setPeriodo(opcion)}>
                {opcion}
              </Chip>
            </ItemListaStagger>
          ))}
        </ListaStagger>
        {cargando ? <p className="text-sm text-hc-muted">Cargando reportes…</p> : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Kpi etiqueta="Productos publicados" valor={String(publicados)} />
          <Kpi etiqueta="Vendidos" valor={String(unidadesVendidas)} />
          <Kpi etiqueta="Ganancia vendida" valor={formatoColon(gananciaVendida)} destacado />
          <Kpi etiqueta="Ganancia potencial" valor={formatoColon(gananciaPotencial)} />
        </div>
        {encargosKpis ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold">Encargos personalizados</h2>
              <Link to={`${RUTA_EMPRENDEDOR}/encargos`} className="text-xs font-semibold text-hc-primary">
                Ver encargos
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi etiqueta="Pendientes de cotizar" valor={String(encargosKpis.pendientes)} destacado={encargosKpis.pendientes > 0} />
              <Kpi etiqueta="Por pagar" valor={String(encargosKpis.pendientePago)} />
              <Kpi etiqueta="Pagados" valor={String(encargosKpis.pagados)} />
              <Kpi
                etiqueta="Conversión cotización → pago"
                valor={conversionEncargos != null ? `${conversionEncargos}%` : '—'}
              />
            </div>
            <p className="text-[11px] text-hc-muted">
              Ticket promedio cotizado: {formatoColon(encargosKpis.ticketPromedioCotizado || 0)}
            </p>
          </section>
        ) : null}
        <h2 className="text-[15px] font-bold">Más vendidos</h2>
        {top.length === 0 && !cargando ? (
          <p className="text-sm text-hc-muted">Todavía no hay ventas para mostrar.</p>
        ) : null}
        <ListaStagger className="flex flex-col gap-[22px]">
          {top.map((item) => (
            <ItemListaStagger key={item.nombre} className="flex items-center gap-3">
              <Miniatura alt="" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{item.nombre}</p>
                <p className="text-[11px] text-hc-muted">{item.vendidos} vendidos</p>
              </div>
              <span className="rounded-full bg-[var(--hc-red-50)] px-2.5 py-1 text-[11px] font-bold text-hc-primary">
                {formatoColon(item.total)}
              </span>
            </ItemListaStagger>
          ))}
        </ListaStagger>
      </main>
    </EntradaPagina>
  )
}

function Kpi({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-[14px] px-3.5 py-4 ${destacado ? 'bg-[var(--hc-red-50)]' : 'bg-hc-surface-2'}`}>
      <p className="text-[11px] font-medium text-hc-muted">{etiqueta}</p>
      <p className={`mt-1.5 text-[19px] font-bold ${destacado ? 'text-hc-primary' : ''}`}>{valor}</p>
    </div>
  )
}

function conversionCotizacionPago(kpis: EncargoKpis | undefined): number | null {
  if (!kpis) return null
  const cotizados = kpis.aprobados + kpis.pendientePago + kpis.pagados + kpis.vencidos
  if (cotizados === 0) return null
  return Math.round((kpis.pagados / cotizados) * 100)
}
