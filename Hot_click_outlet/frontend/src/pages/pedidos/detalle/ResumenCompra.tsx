import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import { ICONOS_PEDIDOS } from '../iconosPedidos'
import { cantidadProductos, envioCompra, totalCompra, totalPaquetes, type CompraCliente } from '../comprasCliente'
import { lineaEnvio, montoProductos, pagadoCon, resumenPaquetes } from '../textosPedido'

function LineaMonto({ etiqueta, monto }: { etiqueta: string; monto: number }) {
  return (
    <div className="flex items-center justify-between gap-[8px] text-[13px] leading-[15px]">
      <span className="text-hc-n-600">{etiqueta}</span>
      <span className="shrink-0 text-hc-n-900">{formatPrice(monto)}</span>
    </div>
  )
}

/** Resumen de la compra en el detalle (Figma `37:1354`). */
export default function ResumenCompra({ compra }: { compra: CompraCliente }) {
  const { t, i18n } = useTranslation()
  const total = totalCompra(compra)
  return (
    <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="text-[12px] leading-[14px] text-hc-n-600">{pagadoCon(t, compra, i18n.language)}</span>
          <span className="font-display text-[16px] font-semibold leading-[20px] text-hc-n-900">{resumenPaquetes(t, compra)}</span>
        </div>
        <span className="shrink-0 font-display text-[18px] font-bold leading-[23px] text-hc-n-900">{formatPrice(total)}</span>
      </div>
      <LineaMonto etiqueta={t('misPedidos.detalle.productos', { count: cantidadProductos(compra) })} monto={montoProductos(compra, total)} />
      <LineaMonto etiqueta={lineaEnvio(t, compra)} monto={envioCompra(compra)} />
      {totalPaquetes(compra) > 1 && (
        <p className="flex items-start gap-[8px] rounded-[10px] bg-hc-blue-50 px-[10px] py-[8px] text-[12px] leading-[16px] text-hc-blue-600">
          <IconoFigma src={ICONOS_PEDIDOS.info} size={16} />
          <span className="min-w-0 flex-1">{t('misPedidos.detalle.nota')}</span>
        </p>
      )}
    </section>
  )
}
