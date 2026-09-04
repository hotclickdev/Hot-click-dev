import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import BadgeEstado from '../ui/BadgeEstado'
import CabeceraAtras from '../ui/CabeceraAtras'
import FilaChips from '../ui/FilaChips'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'
import type { PedidoEmprendedor } from '../types'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import SkeletonLista from '@/prototipo/compartido/motion/SkeletonLista'

const FILTROS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

/**
 * Pedidos (Figma 128:128).
 */
export default function PedidosPage() {
  const { pedidos, cargando, error } = usePedidosEmprendedor()
  const [filtro, setFiltro] = useState('Todos')
  const visibles = useMemo(() => filtrarPedidos(pedidos, filtro), [pedidos, filtro])

  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8 md:max-w-[760px] md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-[18px]">
        <div className="md:hidden">
          <CabeceraAtras titulo="Pedidos" to={RUTA_EMPRENDEDOR} />
          <p className="text-xs text-hc-muted">Tus ventas y su estado de envío</p>
        </div>
        <header className="hidden md:block">
          <h1 className="font-display text-[28px] font-bold">Pedidos</h1>
          <p className="mt-1 text-sm text-hc-muted">Tus ventas y su estado de envío</p>
        </header>
        <div data-mm="seller-filtro-pedidos">
          <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} />
        </div>
        {cargando ? <SkeletonLista filas={4} /> : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        {!cargando && !error && pedidos.length === 0 ? (
          <EstadoVacioConversacional
            titulo="Todavía no tenés pedidos"
            mensaje="Cuando vendas, van a aparecer acá con su estado de envío."
          />
        ) : null}
        {!cargando && pedidos.length > 0 && visibles.length === 0 ? (
          <EstadoVacioConversacional
            titulo="Nada en este filtro"
            mensaje="Probá con otro estado o volvé a Todos para ver todos los pedidos."
          />
        ) : null}
        <div data-mm="seller-lista-pedidos">
          <ListaStagger className="flex flex-col gap-[18px]">
            {visibles.map((pedido) => (
              <ItemListaStagger key={pedido.id}>
                <Link
                  to={`${RUTA_EMPRENDEDOR}/pedidos/${pedido.id}`}
                  className="flex flex-col gap-2 rounded-[14px] border border-hc-border bg-hc-surface p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-bold">Pedido #{pedido.id}</p>
                    <BadgeEstado tono={tonoEstado(pedido.estado)}>{pedido.estado}</BadgeEstado>
                  </div>
                  <p className="text-[11px] text-hc-muted">{pedido.cliente}</p>
                  <p className="text-[13px] font-bold text-hc-primary">{formatoColon(pedido.total)}</p>
                </Link>
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </div>
      </EntradaPagina>
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
