import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { pedidosDelPlan, type EstadoPedido } from './mock'
import { Chip, EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

const FILTROS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

/**
 * Listado de pedidos (Figma 127:254 / 126:254).
 */
export default function PedidosPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos')
  const lista = useMemo(() => {
    const todos = pedidosDelPlan(plan.id)
    if (filtro === 'Todos') return todos
    const mapa: Record<string, EstadoPedido> = {
      Pendientes: 'Pendiente',
      Enviados: 'Enviado',
      Entregados: 'Entregado',
    }
    return todos.filter((item) => item.estado === mapa[filtro])
  }, [filtro, plan.id])

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Pedidos" subtitulo={plan.pedidosSubtitulo} volverA={ruta()} />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTROS.map((item) => (
          <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
        ))}
      </div>
      <ul className="space-y-3">
        {lista.map((pedido) => (
          <li key={pedido.id}>
            <Link to={ruta(`pedidos/${pedido.id}`)} className="block rounded-xl border border-hc-border p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pedido #{pedido.id}</p>
                <EstadoPedidoBadge estado={pedido.estado} />
              </div>
              <p className="mt-2 text-xs text-hc-muted">
                {pedido.cliente}{pedido.sucursal ? ` · ${pedido.sucursal}` : ''}
              </p>
              <p className="mt-1 text-sm font-bold">{formatoColon(pedido.total)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

function EstadoPedidoBadge({ estado }: { estado: EstadoPedido }) {
  const estilo = estiloEstado(estado)
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={estilo}>
      {estado}
    </span>
  )
}

function estiloEstado(estado: EstadoPedido): { background: string; color: string } {
  if (estado === 'Entregado') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'Enviado') return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  if (estado === 'Cancelado') return { background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
