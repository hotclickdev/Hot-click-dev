import { useState } from 'react'
import { formatoColon } from '@/theme/formatoColon'
import { Chip, EncabezadoPagina, Miniatura } from './ui'

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Todo'] as const
const BARRAS = [
  { dia: 'L', alto: 18 },
  { dia: 'M', alto: 30 },
  { dia: 'M2', alto: 22 },
  { dia: 'J', alto: 44 },
  { dia: 'V', alto: 60 },
  { dia: 'S', alto: 38 },
  { dia: 'D', alto: 14 },
] as const

const TOP = [
  { nombre: 'Auriculares Bluetooth X200', vendidos: 5, total: 92500 },
  { nombre: 'Camiseta Oversize Negra', vendidos: 2, total: 19800 },
  { nombre: 'Cargador USB-C 30W', vendidos: 1, total: 7200 },
] as const

/**
 * Reportes del vendedor (Figma 61:270).
 */
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>('Hoy')
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Reportes" subtitulo="Resumen de tu negocio" />
      <div className="mb-4 flex gap-2">
        {PERIODOS.map((item) => (
          <Chip key={item} activo={periodo === item} onClick={() => setPeriodo(item)}>{item}</Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Kpi titulo="Productos publicados" valor="12" />
        <Kpi titulo="Vendidos" valor="8" />
        <Kpi titulo="Ganancia vendida" valor={formatoColon(145000)} />
        <Kpi titulo="Ganancia potencial" valor={formatoColon(320000)} />
      </div>
      <GraficoBarras />
      <h2 className="mb-3 mt-6 text-[15px] font-bold">Más vendidos</h2>
      <ul className="space-y-4">
        {TOP.map((item) => (
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

function GraficoBarras() {
  return (
    <section className="mt-4 rounded-xl border border-hc-border p-4">
      <h2 className="mb-3 text-sm font-semibold">Ventas por día</h2>
      <div className="flex h-20 items-end justify-between px-2">
        {BARRAS.map((barra) => (
          <div key={barra.dia} className="flex w-7 flex-col items-center gap-1">
            <span className="w-3.5 rounded-sm bg-hc-primary" style={{ height: barra.alto }} />
            <span className="text-[10px] text-hc-muted">{barra.dia.replace('2', '')}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
