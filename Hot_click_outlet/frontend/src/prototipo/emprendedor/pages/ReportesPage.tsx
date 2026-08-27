import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import FilaChips from '../ui/FilaChips'
import Miniatura from '../ui/Miniatura'
import { RUTA_EMPRENDEDOR } from '../constants'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Todo'] as const
const DIAS = [
  { letra: 'L', alto: 18 },
  { letra: 'M', alto: 30 },
  { letra: 'M', alto: 22 },
  { letra: 'J', alto: 44 },
  { letra: 'V', alto: 60 },
  { letra: 'S', alto: 38 },
  { letra: 'D', alto: 14 },
] as const

const TOP = [
  { id: 'x200', vendidos: 5, monto: 92500 },
  { id: 'oversize', vendidos: 2, monto: 19800 },
  { id: 'usb-c', vendidos: 1, monto: 7200 },
] as const

/**
 * Paso 4 Reportes (Figma 13:2).
 */
export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<string>('Mes')
  return (
    <main className="flex flex-col gap-[22px] px-5 pt-8">
      <header>
        <h1 className="font-display text-[22px] font-bold">Reportes</h1>
        <p className="text-xs text-hc-muted">Resumen de tu negocio</p>
      </header>
      <FilaChips valor={periodo} opciones={PERIODOS} onChange={setPeriodo} />
      <Kpis />
      <GraficoSemana />
      <h2 className="text-[15px] font-bold">Más vendidos</h2>
      {TOP.map((item) => {
        const producto = PRODUCTOS_DEMO.find((p) => p.id === item.id)
        if (!producto) return null
        return (
          <Link key={item.id} to={`${RUTA_EMPRENDEDOR}/productos/${item.id}/editar`} className="flex items-center gap-3">
            <Miniatura alt="" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{producto.nombre}</p>
              <p className="text-[11px] text-hc-muted">{item.vendidos} vendidos</p>
            </div>
            <span className="rounded-full bg-[var(--hc-red-50)] px-2.5 py-1 text-[11px] font-bold text-hc-primary">
              {formatoColon(item.monto)}
            </span>
          </Link>
        )
      })}
    </main>
  )
}

function Kpis() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Kpi etiqueta="Productos publicados" valor="12" />
      <Kpi etiqueta="Vendidos" valor="8" />
      <Kpi etiqueta="Ganancia vendida" valor={formatoColon(145000)} destacado />
      <Kpi etiqueta="Ganancia potencial" valor={formatoColon(320000)} />
    </div>
  )
}

function Kpi({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div className={`rounded-[14px] px-3.5 py-4 ${destacado ? 'bg-[var(--hc-red-50)]' : 'bg-[var(--hc-n-50)]'}`}>
      <p className="text-[11px] font-medium text-hc-muted">{etiqueta}</p>
      <p className={`mt-1.5 text-[19px] font-bold ${destacado ? 'text-hc-primary' : ''}`}>{valor}</p>
    </div>
  )
}

function GraficoSemana() {
  return (
    <div className="rounded-2xl border border-hc-border px-4 py-[18px]">
      <p className="mb-3.5 text-[13px] font-bold">Ventas por día</p>
      <div className="flex items-end justify-center gap-2.5">
        {DIAS.map((dia, i) => (
          <div key={`${dia.letra}-${i}`} className="flex h-[76px] w-7 flex-col items-center justify-end gap-1.5">
            <div
              className={`w-3.5 rounded-md ${dia.letra === 'V' && i === 4 ? 'bg-hc-primary' : 'bg-[var(--hc-red-300)]'}`}
              style={{ height: dia.alto }}
            />
            <span className="text-[9px] font-medium text-hc-muted">{dia.letra}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
