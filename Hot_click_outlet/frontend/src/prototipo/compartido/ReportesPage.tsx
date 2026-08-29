import { useState } from 'react'
import { formatoColon } from '@/theme/formatoColon'
import { Chip, EncabezadoPagina, Miniatura } from './ui'
import { useReportesVendedor } from './useReportesVendedor'

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Todo'] as const

/**
 * Reportes del vendedor (Figma 61:270) — catálogo y pedidos reales.
 */
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>('Todo')
  const { publicados, unidadesVendidas, gananciaVendida, gananciaPotencial, top, cargando, error } = useReportesVendedor()
  return (
    <main className="px-5 pb-8 pt-[60px]" data-mm="seller-reportes">
      <EncabezadoPagina titulo="Reportes" subtitulo="Resumen de tu negocio" />
      <div className="mb-4 flex gap-2">
        {PERIODOS.map((item) => (
          <Chip key={item} activo={periodo === item} onClick={() => setPeriodo(item)}>{item}</Chip>
        ))}
      </div>
      {cargando ? <p className="mb-3 text-sm text-hc-muted">Cargando reportes…</p> : null}
      {error ? <p className="mb-3 text-sm text-hc-danger">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Kpi titulo="Productos publicados" valor={String(publicados)} />
        <Kpi titulo="Vendidos" valor={String(unidadesVendidas)} />
        <Kpi titulo="Ganancia vendida" valor={formatoColon(gananciaVendida)} />
        <Kpi titulo="Ganancia potencial" valor={formatoColon(gananciaPotencial)} />
      </div>
      <h2 className="mb-3 mt-6 text-[15px] font-bold">Más vendidos</h2>
      {top.length === 0 && !cargando ? (
        <p className="text-sm text-hc-muted">Todavía no hay ventas para mostrar.</p>
      ) : null}
      <ul className="space-y-4">
        {top.map((item) => (
          <li key={item.nombre} className="flex items-center gap-3">
            <Miniatura className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{item.vendidos} vendidos</p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--hc-success-bg)' }}>
              {formatoColon(item.total)}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}

function Kpi({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-hc-surface-2 p-3.5">
      <p className="text-xs text-hc-muted">{titulo}</p>
      <p className="mt-1 text-xl font-bold">{valor}</p>
    </div>
  )
}
