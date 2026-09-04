import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { Chip } from './ui'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import ListadoFeedback from './ListadoFeedback'
import type { PedidoMock } from './mock'
import {
  FILTROS_PEDIDOS,
  filtrarPedidos,
  estiloEstadoPedido,
} from './pedidosListaHelpers'

export type PedidosListaVariante = 'emp' | 'seller'

type Props = Readonly<{
  pedidos: PedidoMock[]
  cargando: boolean
  error: string | null
  hrefPedido: (id: string) => string
  encabezado: ReactNode
  variante?: PedidosListaVariante
  mostrarSucursal?: 'negocioPlus' | 'siExiste' | 'nunca'
}>

/**
 * Vista compartida listado Pedidos — chrome lo aporta Emp / Seller.
 */
export default function PedidosListaVista({
  pedidos,
  cargando,
  error,
  hrefPedido,
  encabezado,
  variante = 'seller',
  mostrarSucursal = 'nunca',
}: Props) {
  const [filtro, setFiltro] = useState<(typeof FILTROS_PEDIDOS)[number]>('Todos')
  const visibles = useMemo(() => filtrarPedidos(pedidos, filtro), [pedidos, filtro])
  const emp = variante === 'emp'
  const mainClass = emp
    ? 'flex flex-col gap-[18px] px-5 pb-10 pt-8 md:max-w-[760px] md:px-16 md:py-12'
    : 'px-5 pb-8 pt-[60px] md:px-12 md:py-12 md:pt-12'
  const listaClass = emp ? 'flex flex-col gap-[18px]' : 'space-y-3 md:max-w-[760px]'

  return (
    <main className={mainClass}>
      <EntradaPagina className={emp ? 'flex flex-col gap-[18px]' : undefined}>
        {encabezado}
        <div
          className={emp ? undefined : 'mb-4 flex gap-2 overflow-x-auto'}
          data-mm="seller-filtro-pedidos"
        >
          {emp ? (
            <div className="flex gap-2 overflow-x-auto">
              {FILTROS_PEDIDOS.map((item) => (
                <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>
                  {item}
                </Chip>
              ))}
            </div>
          ) : (
            FILTROS_PEDIDOS.map((item) => (
              <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>
                {item}
              </Chip>
            ))
          )}
        </div>
        <div data-mm="seller-lista-pedidos">
          <ListadoFeedback
            cargando={cargando}
            error={error}
            cantidad={pedidos.length}
            skeletonVariante="tarjeta"
            skeletonLabel="Cargando pedidos"
            className={listaClass}
            empty={(
              <EstadoVacioConversacional
                titulo="Todavía no tenés pedidos"
                mensaje="Cuando alguien compre en tu tienda, vas a ver el estado acá."
              />
            )}
          >
            {visibles.length === 0 ? (
              <EstadoVacioConversacional
                titulo="Nada en este filtro"
                mensaje="Probá con otro estado o volvé a Todos."
              />
            ) : (
              <ListaStagger className={listaClass}>
                {visibles.map((pedido) => (
                  <ItemListaStagger key={pedido.id}>
                    <TarjetaPedido
                      pedido={pedido}
                      to={hrefPedido(pedido.id)}
                      emp={emp}
                      mostrarSucursal={mostrarSucursal}
                    />
                  </ItemListaStagger>
                ))}
              </ListaStagger>
            )}
          </ListadoFeedback>
        </div>
      </EntradaPagina>
    </main>
  )
}

function TarjetaPedido({
  pedido,
  to,
  emp,
  mostrarSucursal,
}: {
  pedido: PedidoMock
  to: string
  emp: boolean
  mostrarSucursal: Props['mostrarSucursal']
}) {
  const sucursalLinea = lineaSucursal(pedido.sucursal, mostrarSucursal)
  return (
    <Link
      to={to}
      className={
        emp
          ? 'flex flex-col gap-2 rounded-[14px] border border-hc-border bg-hc-surface p-3.5'
          : 'block rounded-xl border border-hc-border bg-hc-surface p-3.5'
      }
    >
      <div className="flex items-center justify-between">
        <p className={emp ? 'text-[13px] font-bold' : 'text-sm font-medium'}>
          Pedido #{pedido.id}
        </p>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-medium"
          style={estiloEstadoPedido(pedido.estado)}
        >
          {pedido.estado}
        </span>
      </div>
      <p className={emp ? 'text-[11px] text-hc-muted' : 'mt-2 text-xs text-hc-muted'}>
        {pedido.cliente}
      </p>
      {sucursalLinea ? (
        <p className="mt-1 text-xs text-hc-muted">{sucursalLinea}</p>
      ) : null}
      <p className={emp ? 'text-[13px] font-bold text-hc-primary' : 'mt-1 text-sm font-bold text-hc-primary'}>
        {formatoColon(pedido.total)}
      </p>
    </Link>
  )
}

function lineaSucursal(
  sucursal: string | undefined,
  modo: Props['mostrarSucursal'],
): string | null {
  if (modo === 'nunca') return null
  if (modo === 'negocioPlus') return `Sucursal: ${sucursal ?? '—'}`
  if (!sucursal) return null
  return `Sucursal: ${sucursal}`
}
