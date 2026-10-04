import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { PaqueteGuardado } from '@/pages/checkout/compraGuardada'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { useTextosEntrega } from '@/pages/checkout/useTextosEntrega'

type PaquetesPedidoProps = {
  numeroPedido: string
  paquetes: PaqueteGuardado[]
}

function FilaPaquete({ paquete }: { paquete: PaqueteGuardado }) {
  const { t } = useTranslation()
  const { corto } = useTextosEntrega()
  const detalle = [
    paquete.provincia ? t('compra.carrito.saleDe', { provincia: paquete.provincia }) : '',
    t('compra.resumen.cantidad', { count: paquete.cantidad }),
    corto(paquete.metodoEnvio),
  ].filter(Boolean).join(' · ')

  return (
    <li className="flex items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-[12px]">
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
        <IconoFigma src={ICONOS_COMPRA.paquete} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[14px] font-semibold text-hc-n-900">{paquete.tienda}</span>
        <span className="text-[12px] leading-[16px] text-hc-n-600">{detalle}</span>
      </span>
      <span className="shrink-0 rounded-full bg-hc-warning-bg px-[8px] py-[3px] text-[11px] font-semibold text-hc-warning">
        {t('compra.exito.preparando')}
      </span>
    </li>
  )
}

/** «Tu pedido llega en N paquetes» del pago exitoso (Figma `37:1901`). */
export default function PaquetesPedido({ numeroPedido, paquetes }: PaquetesPedidoProps) {
  const { t } = useTranslation()
  return (
    <section className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      <h2 className="bg-hc-n-50 px-[14px] py-[12px] font-display text-[15px] font-bold text-hc-n-900">
        {t('compra.exito.llegaEn', { numero: numeroPedido, count: paquetes.length })}
      </h2>
      <ul>
        {paquetes.map((paquete, indice) => <FilaPaquete key={`${indice}-${paquete.tienda}`} paquete={paquete} />)}
      </ul>
      <p className="flex items-center gap-[8px] border-t border-hc-n-200 px-[14px] py-[12px] text-[12px] leading-[16px] text-hc-n-600">
        <IconoFigma src={ICONOS_COMPRA.correo} size={16} className="shrink-0" />
        {t('compra.exito.avisoGuias')}
      </p>
    </section>
  )
}
