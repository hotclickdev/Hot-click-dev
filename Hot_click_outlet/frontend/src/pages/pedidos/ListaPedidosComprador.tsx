import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { fechaConAnio, fechaCorta, miniaturasDePedido } from '../perfil/cuenta/cuentaHelpers'
import { IcoChevron } from '../perfil/cuenta/iconosCuenta'
import { Miniatura } from '../perfil/cuenta/piezasCuenta'
import ChipEstadoPedido from './ChipEstadoPedido'
import {
  FILTROS_PEDIDOS, cantidadProductos, filtrarPedidos, paquetesEntregados, tiendasDelPedido,
  type FiltroPedidos, type PedidoComprador,
} from './pedidoVistaHelpers'

type ListaPedidosCompradorProps = {
  pedidos: PedidoComprador[]
  filtro: FiltroPedidos
  onFiltro: (filtro: FiltroPedidos) => void
}

/** Línea del pie de cada tarjeta: Figma `28:1358` (varios paquetes) y `28:1376` / `28:1394` (un paquete). */
function usePie(pedido: PedidoComprador, idioma: string): string {
  const { t } = useTranslation()
  if (pedido.paquetes.length > 1) {
    return t('misPedidos.resumenPaquetes', {
      paquetes: t('misPedidos.paquetes', { count: pedido.paquetes.length }),
      entregados: t('misPedidos.paquetesEntregados', { count: paquetesEntregados(pedido) }),
    })
  }
  const unico = pedido.paquetes[0]
  const llegada = fechaCorta(unico.fechaEntregaEstimada, idioma)
  switch (pedido.estado) {
    case 'ENTREGADO': return t('misPedidos.pie.entregadoEl', { fecha: fechaCorta(unico.fechaEntregaReal ?? unico.fechaPedido, idioma) })
    case 'ENVIADO': return llegada ? t('misPedidos.pie.llegaEl', { fecha: llegada }) : t('misPedidos.pie.enCamino')
    case 'LISTO_RETIRO': return t('misPedidos.pie.listoRetiro')
    case 'EN_PREPARACION': return t('misPedidos.pie.enPreparacion')
    case 'PAGADO': return t('misPedidos.pie.pagado')
    case 'CANCELADO': return t('misPedidos.pie.cancelado')
    default: return t('misPedidos.pie.pendiente')
  }
}

function TarjetaPedido({ pedido }: { pedido: PedidoComprador }) {
  const { t, i18n } = useTranslation()
  const pie = usePie(pedido, i18n.language)
  const fotos = miniaturasDePedido(pedido.paquetes, 2)
  const productos = cantidadProductos(pedido)
  const tiendas = tiendasDelPedido(pedido)
  const etiqueta = /^\d+$/.test(pedido.numero) ? `#${pedido.numero}` : pedido.numero
  const detalle = productos > 0
    ? [t('misPedidos.productos', { count: productos }), tiendas > 1 ? t('misPedidos.tiendas', { count: tiendas }) : null].filter(Boolean).join(' · ')
    : ''
  return (
    <article className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-px">
          <h2 className="truncate text-[14px] font-semibold leading-4 text-hc-n-900">{t('misPedidos.pedido', { numero: etiqueta })}</h2>
          <p className="text-[12px] leading-[14px] text-hc-n-500">{fechaConAnio(pedido.fecha, i18n.language)}</p>
        </div>
        <ChipEstadoPedido estado={pedido.estado} />
      </div>
      <div className="flex items-center gap-2">
        {fotos.map((f, i) => <Miniatura key={i} src={f.src} tam={52} />)}
        <div className="flex min-w-0 flex-1 flex-col items-end gap-px">
          <p className="font-display text-[15px] font-bold text-hc-n-900">{formatPrice(pedido.total)}</p>
          {detalle && <p className="text-[12px] text-hc-n-500">{detalle}</p>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[12px] text-hc-n-600">{pie}</p>
        <Link
          to={`/mis-pedidos?pedido=${encodeURIComponent(pedido.numero)}`}
          aria-label={t('misPedidos.verDetalleDe', { numero: etiqueta })}
          className="flex shrink-0 items-center gap-[2px] text-[13px] font-semibold text-hc-blue-600"
        >
          {t('misPedidos.verDetalle')}
          <IcoChevron size={14} />
        </Link>
      </div>
    </article>
  )
}

/** Mis pedidos: Figma `28:1310`. Chips de filtro (con desplazamiento horizontal) y una tarjeta por pedido. */
export default function ListaPedidosComprador({ pedidos, filtro, onFiltro }: ListaPedidosCompradorProps) {
  const { t } = useTranslation()
  const visibles = filtrarPedidos(pedidos, filtro)
  return (
    <div className="flex flex-col lg:mx-auto lg:w-full lg:max-w-[560px]">
      {/* En escritorio no hay barra interna: el título de la pantalla es este h1 (Figma no dibuja la versión de escritorio). */}
      <h1 className="hidden font-display text-[28px] font-bold leading-[normal] text-hc-n-900 lg:block lg:pt-8">{t('cuenta.menu.pedidos')}</h1>
      <div role="tablist" aria-label={t('misPedidos.filtros.etiqueta')} className="flex gap-2 overflow-x-auto pb-1 pl-4 pt-[14px] [scrollbar-width:none] lg:pl-0">
        {FILTROS_PEDIDOS.map((id) => {
          const activo = id === filtro
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => onFiltro(id)}
              className={`shrink-0 rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal] ${activo ? 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
            >
              {t(`misPedidos.filtros.${id}`)}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-5 pt-3 lg:px-0">
        {visibles.length === 0
          ? <p className="py-8 text-center text-[13px] text-hc-n-600">{t('misPedidos.sinResultados')}</p>
          : visibles.map((p) => <TarjetaPedido key={p.clave} pedido={p} />)}
      </div>
    </div>
  )
}
