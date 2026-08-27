import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import BadgeEstado from '../ui/BadgeEstado'
import CabeceraAtras from '../ui/CabeceraAtras'
import FilaChips from '../ui/FilaChips'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'
import type { PedidoEmprendedor } from '../types'

const FILTROS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

/**
 * Pedidos (Figma 128:128).
 */
export default function PedidosPage() {
  const { pedidos } = usePedidosEmprendedor()
  const [filtro, setFiltro] = useState('Todos')
  const visibles = useMemo(() => filtrarPedidos(pedidos, filtro), [pedidos, filtro])

  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <div>
        <CabeceraAtras titulo="Pedidos" to={RUTA_EMPRENDEDOR} />
        <p className="text-xs text-hc-muted">Tus ventas y su estado de envío</p>
      </div>
      <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} />
      {visibles.map((pedido) => (
        <Link
          key={pedido.id}
          to={`${RUTA_EMPRENDEDOR}/pedidos/${pedido.id}`}
          className="flex flex-col gap-2 rounded-[14px] border border-hc-border p-3.5"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold">Pedido #{pedido.id}</p>
            <BadgeEstado tono={tonoEstado(pedido.estado)}>{pedido.estado}</BadgeEstado>
          </div>
          <p className="text-[11px] text-hc-muted">{pedido.cliente}</p>
          <p className="text-[13px] font-bold text-hc-primary">{formatoColon(pedido.total)}</p>
        </Link>
      ))}
    </main>
  )
}

function filtrarPedidos(pedidos: PedidoEmprendedor[], filtro: string) {
  if (filtro === 'Todos') return pedidos
  if (filtro === 'Pendientes') return pedidos.filter((p) => p.estado === 'Pendiente')
  if (filtro === 'Enviados') return pedidos.filter((p) => p.estado === 'Enviado')
  return pedidos.filter((p) => p.estado === 'Entregado')
}

function tonoEstado(estado: PedidoEmprendedor['estado']) {
  if (estado === 'Entregado') return 'exito' as const
  if (estado === 'Enviado') return 'info' as const
  return 'alerta' as const
}
