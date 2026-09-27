import { formatoColon } from '@/theme/formatoColon'
import { textoOtrosNegocios, type DespachoPaquete, type EtapaDespacho } from './despachoPaquete'

const CHIP_ETAPA: Record<EtapaDespacho, { texto: string; clase: string }> = {
  porDespachar: { texto: 'Por despachar', clase: 'bg-hc-warning-bg text-hc-warning' },
  despachado: { texto: 'Despachado', clase: 'bg-hc-green-50 text-hc-green-600' },
  cancelado: { texto: 'Cancelado', clase: 'bg-[#fef2f1] text-hc-red-600' },
}

type Props = Readonly<{ despacho: DespachoPaquete; etapa: EtapaDespacho }>

/** Card «Subpedido» (Figma `37:1789`): solo los productos de este negocio. */
export default function TarjetaSubpedido({ despacho, etapa }: Props) {
  const chip = CHIP_ETAPA[etapa]
  const otros = textoOtrosNegocios(despacho.otrosNegocios)
  return (
    <section className="flex w-full flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <p className="truncate font-mono text-[11px] font-medium text-hc-n-500">
          Pedido {despacho.numeroCompra} · Paquete {despacho.numeroPaquete} de {despacho.cantidadPaquetes}
        </p>
        <span className={`shrink-0 rounded-full px-[8px] py-[3px] text-[11px] font-semibold ${chip.clase}`}>{chip.texto}</span>
      </div>
      <h2 className="text-[15px] font-semibold text-hc-n-900">{despacho.negocio} · tus productos</h2>
      <ul className="flex flex-col gap-[10px]">
        {despacho.productos.map((producto, i) => (
          <li key={`${producto.nombre}-${i}`} className="flex items-center gap-[10px]">
            {producto.imagenUrl ? (
              <img src={producto.imagenUrl} alt="" width={44} height={44} loading="lazy" className="size-[44px] shrink-0 rounded-[8px] object-cover" />
            ) : (
              <span className="size-[44px] shrink-0 rounded-[8px] bg-hc-n-100" />
            )}
            <span className="min-w-0 flex-1 truncate text-[13px] text-hc-n-900">
              {producto.nombre} · {producto.cantidad} u.
            </span>
            <span className="shrink-0 font-display text-[13px] font-semibold text-hc-n-900">{formatoColon(producto.subtotal)}</span>
          </li>
        ))}
      </ul>
      {otros ? <p className="text-[12px] leading-[16px] text-hc-n-500">{otros}</p> : null}
    </section>
  )
}
