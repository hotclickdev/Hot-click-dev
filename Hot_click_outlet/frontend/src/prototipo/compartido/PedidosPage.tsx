import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Chip, EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { usePedidosEmprendedor } from '@/prototipo/emprendedor/hooks/usePedidosEmprendedor'
import type { PedidoMock } from './mock'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import SkeletonLista from './motion/SkeletonLista'

const FILTROS = ['Todos', 'Pendientes', 'Enviados', 'Entregados'] as const

/**
 * Listado de pedidos (Figma 305:378 / 352:9679) — API real.
 */
export default function PedidosPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const { seller, cargando, error } = usePedidosEmprendedor()
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos')
  const lista = useMemo(() => filtrar(seller, filtro), [filtro, seller])

  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12 md:pt-12">
      <EntradaPagina>
        <div className="md:hidden">
          <EncabezadoPagina titulo="Pedidos" subtitulo={plan.pedidosSubtitulo} volverA={ruta()} />
        </div>
        <header className="mb-5 hidden md:block">
          <h1 className="font-display text-[28px] font-bold">Pedidos</h1>
          <p className="mt-1 text-sm text-hc-muted">{plan.pedidosSubtitulo}</p>
        </header>
        <div className="mb-4 flex gap-2 overflow-x-auto" data-mm="seller-filtro-pedidos">
          {FILTROS.map((item) => (
            <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
          ))}
        </div>
        {cargando ? <SkeletonLista className="mt-2" filas={4} /> : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        {!cargando && !error && seller.length === 0 ? (
          <EstadoVacioConversacional
            titulo="Todavía no tenés pedidos"
            mensaje="Cuando vendas, van a aparecer acá con su estado de envío."
          />
        ) : null}
        {!cargando && seller.length > 0 && lista.length === 0 ? (
          <EstadoVacioConversacional
            titulo="Nada en este filtro"
            mensaje="Probá con otro estado o volvé a Todos para ver todos los pedidos."
          />
        ) : null}
        <div data-mm="seller-lista-pedidos">
          <ListaStagger className="space-y-3 md:max-w-[760px]">
            {lista.map((pedido) => (
              <ItemListaStagger key={pedido.id}>
                <Link
                  to={ruta(`pedidos/${pedido.id}`)}
                  className="block rounded-xl border border-hc-border bg-hc-surface p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Pedido #{pedido.id}</p>
                    <EstadoPedidoBadge estado={pedido.estado} />
                  </div>
                  <p className="mt-2 text-xs text-hc-muted">{pedido.cliente}</p>
                  {plan.id === 'negocioPlus' ? (
                    <p className="mt-1 text-xs text-hc-muted">
                      Sucursal: {pedido.sucursal ?? '—'}
                    </p>
                  ) : pedido.sucursal ? (
                    <p className="mt-1 text-xs text-hc-muted">Sucursal: {pedido.sucursal}</p>
                  ) : null}
                  <p className="mt-1 text-sm font-bold text-hc-primary">{formatoColon(pedido.total)}</p>
                </Link>
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </div>
      </EntradaPagina>
    </main>
  )
}

function filtrar(todos: PedidoMock[], filtro: string): PedidoMock[] {
  if (filtro === 'Todos') return todos
  if (filtro === 'Pendientes') return todos.filter((item) => item.estado === 'Pendiente')
  if (filtro === 'Enviados') return todos.filter((item) => item.estado === 'Enviado')
  return todos.filter((item) => item.estado === 'Entregado')
}

function EstadoPedidoBadge({ estado }: { estado: PedidoMock['estado'] }) {
  const estilo = estiloEstado(estado)
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-medium" style={estilo}>
      {estado}
    </span>
  )
}

function estiloEstado(estado: PedidoMock['estado']): { background: string; color: string } {
  if (estado === 'Entregado') return { background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
  if (estado === 'Enviado') return { background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }
  if (estado === 'Cancelado') return { background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }
  return { background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }
}
