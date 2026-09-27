import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import PillEstado from './PillEstado'
import { ICONOS_PEDIDOS } from './iconosPedidos'
import {
  cantidadProductos,
  estadoCompra,
  miniaturasCompra,
  totalCompra,
  totalPaquetes,
  type CompraCliente,
  type EstadoCompra,
  type Miniatura,
} from './comprasCliente'
import { fechaCorta } from './fechasPedido'
import { pieTarjeta } from './textosPedido'
import type { TonoEstado } from './paquetePedido'

const TONO_COMPRA: Record<EstadoCompra, TonoEstado> = {
  enCamino: 'azul',
  enPreparacion: 'ambar',
  entregado: 'verde',
  cancelado: 'rojo',
  pendiente: 'ambar',
}

function MiniaturaProducto({ miniatura }: { miniatura: Miniatura }) {
  if (!miniatura.url) return <span aria-hidden="true" className="size-[52px] shrink-0 rounded-[10px] bg-hc-n-100" />
  return <img src={miniatura.url} alt={miniatura.nombre} className="size-[52px] shrink-0 rounded-[10px] object-cover" loading="lazy" />
}

function DetalleCantidades({ compra }: { compra: CompraCliente }) {
  const { t } = useTranslation()
  const productos = t('misPedidos.tarjeta.productos', { count: cantidadProductos(compra) })
  const paquetes = totalPaquetes(compra)
  return (
    <span className="text-[12px] leading-[14px] text-hc-n-500">
      {paquetes > 1 ? `${productos} · ${t('misPedidos.tarjeta.tiendas', { count: paquetes })}` : productos}
    </span>
  )
}

/** Tarjeta de una compra en «Mis pedidos» (Figma `28:1344`). */
export default function TarjetaCompra({ compra }: { compra: CompraCliente }) {
  const { t, i18n } = useTranslation()
  const estado = estadoCompra(compra)
  return (
    <article className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex min-w-0 flex-col gap-px whitespace-nowrap">
          <h2 className="truncate text-[14px] font-semibold leading-[16px] text-hc-n-900">{t('misPedidos.tarjeta.titulo', { numero: compra.numero })}</h2>
          <span className="text-[12px] leading-[14px] text-hc-n-500">{fechaCorta(compra.fecha, i18n.language)}</span>
        </div>
        <PillEstado tono={TONO_COMPRA[estado]} texto={t(`misPedidos.estadoCompra.${estado}`)} />
      </div>
      <div className="flex items-center gap-[8px]">
        {miniaturasCompra(compra).map((miniatura, indice) => <MiniaturaProducto key={indice} miniatura={miniatura} />)}
        <div className="flex min-w-0 flex-1 flex-col items-end gap-px whitespace-nowrap">
          <span className="font-display text-[15px] font-bold leading-[19px] text-hc-n-900">{formatPrice(totalCompra(compra))}</span>
          <DetalleCantidades compra={compra} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-[8px]">
        <span className="min-w-0 truncate text-[12px] leading-[14px] text-hc-n-600">{pieTarjeta(t, compra, i18n.language)}</span>
        {compra.idDetalle != null && (
          <Link to={`/mis-pedidos/${compra.idDetalle}`} className="flex shrink-0 items-center gap-[2px] text-[13px] font-semibold leading-[15px] text-hc-blue-600">
            {t('misPedidos.tarjeta.verDetalle')}
            <IconoFigma src={ICONOS_PEDIDOS.chevronDerecha} size={14} />
          </Link>
        )}
      </div>
    </article>
  )
}
