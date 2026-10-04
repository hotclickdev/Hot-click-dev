import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import PillEstado from '../PillEstado'
import { ICONOS_PEDIDOS } from '../iconosPedidos'
import { nombreItem, totalPaquetes, type CompraCliente } from '../comprasCliente'
import { TONO_ESTADO_PAQUETE, estadoPaquete, nombreTienda } from '../paquetePedido'
import { origenPaquete } from '../textosPedido'
import type { ItemPedidoCliente, PedidoCliente } from '../pedidoHelpers'
import AccionesPaquete from './AccionesPaquete'
import GuiaPaquete from './GuiaPaquete'

function montoItem(item: ItemPedidoCliente): number {
  return item.subtotalItem ?? (item.precioUnitarioMomento ?? 0) * (item.cantidad ?? 1)
}

function FilaProducto({ item }: { item: ItemPedidoCliente }) {
  const imagen = item.producto?.imagenPrincipalUrl
  return (
    <div className="flex items-center gap-[10px]">
      {imagen
        ? <img src={imagen} alt="" className="size-[44px] shrink-0 rounded-[8px] object-cover" loading="lazy" />
        : <span aria-hidden="true" className="size-[44px] shrink-0 rounded-[8px] bg-hc-n-100" />}
      <span className="min-w-0 flex-1 truncate text-[13px] leading-[15px] text-hc-n-900">{nombreItem(item)}</span>
      <span className="shrink-0 font-display text-[13px] font-semibold leading-[16px] text-hc-n-900">{formatPrice(montoItem(item))}</span>
    </div>
  )
}

type TarjetaPaqueteProps = { compra: CompraCliente; paquete: PedidoCliente }

/** Un paquete de la compra, despachado por su tienda (Figma `37:1371`). */
export default function TarjetaPaquete({ compra, paquete }: TarjetaPaqueteProps) {
  const { t } = useTranslation()
  const estado = estadoPaquete(paquete)
  return (
    <article className="flex flex-col gap-[12px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="font-mono text-[11px] font-medium leading-[14px] text-hc-n-600">
          {t('misPedidos.paquete.numero', { numero: paquete.numeroPaquete ?? 1, total: totalPaquetes(compra) })}
        </span>
        <PillEstado tono={TONO_ESTADO_PAQUETE[estado]} texto={t(`misPedidos.estadoPaquete.${estado}`)} />
      </div>
      <div className="flex items-center gap-[8px]">
        <IconoFigma src={ICONOS_PEDIDOS.paquete} size={18} className="text-hc-n-900" />
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <h2 className="truncate text-[15px] font-semibold leading-[18px] text-hc-n-900">{nombreTienda(paquete)}</h2>
          <span className="flex items-center gap-[4px] text-[12px] leading-[14px] text-hc-n-600">
            <IconoFigma src={ICONOS_PEDIDOS.pin} size={12} />
            <span className="truncate">{origenPaquete(t, paquete)}</span>
          </span>
        </div>
      </div>
      {(paquete.items ?? []).map((item, indice) => <FilaProducto key={item.producto?.id ?? indice} item={item} />)}
      <GuiaPaquete paquete={paquete} />
      <AccionesPaquete compra={compra} paquete={paquete} />
    </article>
  )
}
