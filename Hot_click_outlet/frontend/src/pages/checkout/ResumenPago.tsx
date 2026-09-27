import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import CampoCupon from '@/pages/carrito/CampoCupon'
import LineaMonto from '@/pages/carrito/LineaMonto'
import PaqueteResumen from '@/pages/carrito/PaqueteResumen'
import { formatPrice } from '@/utils/format'
import CampoGiftCard from './CampoGiftCard'
import { ICONOS_COMPRA } from './iconosCompra'
import { costoEnvio } from './paquetesCompra'
import type { FormularioCompra } from './useFormularioCompra'
import { useTextosEntrega } from './useTextosEntrega'

/** Resumen del pedido en el pago móvil (`29:1344`): paquetes, montos y cupón. */
export default function ResumenPago({ form }: { form: FormularioCompra }) {
  const { t } = useTranslation()
  const textos = useTextosEntrega()
  const { paquetes, envios, totales, cupon, giftCard } = form
  const [abierto, setAbierto] = useState(true)
  const [cuponAbierto, setCuponAbierto] = useState(Boolean(cupon.cupon || giftCard.aplicada))

  return (
    <div className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-[8px]">
        <p className="text-[14px] font-semibold text-hc-n-900">
          {t('compra.pago.resumenTitulo', {
            productos: t('compra.resumen.cantidad', { count: totales.cantidadProductos }),
            count: paquetes.length,
          })}
        </p>
        <button type="button" onClick={() => setAbierto((valor) => !valor)} aria-expanded={abierto} className="text-[12px] font-semibold text-hc-blue-600">
          {abierto ? t('compra.pago.ocultar') : t('compra.pago.ver')}
        </button>
      </div>
      {abierto ? (
        <>
          {paquetes.map((paquete) => (
            <PaqueteResumen
              key={paquete.clave}
              paquete={paquete}
              envio={costoEnvio(envios[paquete.clave])}
              entrega={textos.corto(envios[paquete.clave])}
            />
          ))}
          <div className="h-px w-full bg-hc-n-200" />
          <LineaMonto etiqueta={t('compra.pago.productos')} monto={formatPrice(totales.subtotal)} />
          <LineaMonto etiqueta={t('compra.resumen.envio', { count: paquetes.length })} monto={formatPrice(totales.envio)} />
          {totales.descuento > 0 ? (
            <LineaMonto etiqueta={t('compra.resumen.descuento', { codigo: cupon.cupon?.codigo })} monto={`−${formatPrice(totales.descuento)}`} />
          ) : null}
          {totales.descuentoSinpe > 0 ? (
            <LineaMonto etiqueta={t('compra.resumen.descuentoSinpe')} monto={`−${formatPrice(totales.descuentoSinpe)}`} />
          ) : null}
          {totales.giftCard > 0 ? (
            <LineaMonto etiqueta={t('compra.resumen.giftCard')} monto={`−${formatPrice(totales.giftCard)}`} />
          ) : null}
          <p className="text-[11px] leading-[15px] text-hc-n-500">{t('compra.resumen.notaDesktop')}</p>
        </>
      ) : null}
      {cuponAbierto ? (
        <>
          <CampoCupon cupon={cupon} />
          <CampoGiftCard giftCard={giftCard} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setCuponAbierto(true)}
          className="flex items-center gap-[6px] self-start text-[13px] font-semibold text-hc-blue-600"
        >
          <IconoFigma src={ICONOS_COMPRA.cuponChico} size={14} />
          {t('compra.pago.tenesCupon')}
        </button>
      )}
    </div>
  )
}
