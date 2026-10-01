import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { formatPrice } from '@/utils/format'
import { formatoRebaja } from '@/pages/checkout/codigoDescuentoHelpers'
import type { PaqueteCarrito } from './cartHelpers'

type ResumenCarritoProps = {
  paquetes: PaqueteCarrito[]
  unidades: number
  subtotal: number
  envio: number
  total: number
  escritorio: boolean
  onContinuar: () => void
  /** Carrito de escritorio: "Pedir por WhatsApp" como enlace de texto bajo el botón (función previa; Figma `30:2351` no lo dibuja). */
  onWhatsApp?: () => void
  /** Descuento del cupón y saldo de gift card ya aplicados (0 si no hay). */
  descuento?: number
  cuponPorcentaje?: number
  giftCard?: number
  /** Campos de cupón (y gift card) que despliega "Agregar cupón" en la columna de escritorio. */
  codigosEscritorio?: ReactNode
  /** Checkout de escritorio (Figma `30:2492`): el botón es "Pagar" y el aviso de consentimiento va antes. */
  textoBoton?: string
  consentimiento?: ReactNode
  botonDeshabilitado?: boolean
  /** El envío total no incluye el costo de encomienda (lo cobra la empresa de transporte). */
  envioVaria?: boolean
}

/** Línea de descuento aplicado (cupón o gift card): no está en Figma, solo aparece al aplicar un código. */
function LineaRebaja({ etiqueta, monto, clase }: { etiqueta: string; monto: number; clase: string }) {
  return (
    <div className={`flex items-center justify-between ${clase}`}>
      <p className="font-medium text-hc-n-600">{etiqueta}</p>
      <p className="font-semibold text-hc-success">{formatoRebaja(monto)}</p>
    </div>
  )
}

/** Resumen del pedido: Figma `37:1647` (móvil, dentro del flujo) y `30:2351` (escritorio, columna lateral). */
export default function ResumenCarrito({
  paquetes, unidades, subtotal, envio, total, escritorio, onContinuar, onWhatsApp,
  descuento = 0, cuponPorcentaje = 0, giftCard = 0, codigosEscritorio, textoBoton, consentimiento, botonDeshabilitado, envioVaria = false,
}: ResumenCarritoProps) {
  const { t } = useTranslation()
  const [detalleAbierto, setDetalleAbierto] = useState(true)
  const [codigosAbiertos, setCodigosAbiertos] = useState(false)

  if (escritorio) {
    return (
      <aside className="flex w-[380px] shrink-0 flex-col gap-[14px] rounded-[18px] border border-hc-n-200 bg-hc-n-0 p-6 leading-[normal]">
        <h2 className="font-display text-[18px] font-bold tracking-normal text-hc-n-900">{t('cart.summary')}</h2>
        <div className="h-px bg-hc-n-200" />
        {paquetes.map((paquete) => (
          <div key={paquete.clave} className="flex flex-col gap-px">
            <div className="flex items-center justify-between text-[13px] font-semibold text-hc-n-900">
              <p>{paquete.negocio}</p>
              <p>{formatPrice(paquete.subtotal)}</p>
            </div>
            <div className="flex items-center justify-between text-[12px] text-hc-n-500">
              <p>{t('cart.paqueteProductos', { count: paquete.items.length })}</p>
              <p>{paquete.envioVaria ? t('checkout.f.envioVariaLinea') : t('cart.envioDe', { precio: formatPrice(paquete.envio) })}</p>
            </div>
          </div>
        ))}
        <div className="h-px bg-hc-n-200" />
        <div className="flex items-center justify-between text-[13px]">
          <p className="font-medium text-hc-n-600">{t('cart.productosLinea', { count: unidades })}</p>
          <p className="font-semibold text-hc-n-900">{formatPrice(subtotal)}</p>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <p className="font-medium text-hc-n-600">{t('cart.envioLinea', { count: paquetes.length })}</p>
          <p className="font-semibold text-hc-n-900">{envioVaria && envio === 0 ? t('checkout.f.varia') : formatPrice(envio)}</p>
        </div>
        {descuento > 0 && <LineaRebaja etiqueta={t('checkout.codigo.lineaDescuento', { porcentaje: cuponPorcentaje })} monto={descuento} clase="text-[13px]" />}
        {giftCard > 0 && <LineaRebaja etiqueta={t('cart.giftCardLinea')} monto={giftCard} clase="text-[13px]" />}
        {codigosEscritorio && (
          <>
            <button
              type="button"
              onClick={() => setCodigosAbiertos((v) => !v)}
              aria-expanded={codigosAbiertos}
              className="flex items-center gap-[6px] text-left text-[13px] font-semibold text-hc-blue-600"
            >
              <IconoFigma src={ICONOS_CHECKOUT.cupon} size={14} className="text-hc-blue-600" />
              {t('cart.agregarCupon')}
            </button>
            {codigosAbiertos && codigosEscritorio}
          </>
        )}
        <div className="h-px bg-hc-n-200" />
        <div className="flex items-center justify-between text-hc-n-900">
          <p className="text-[16px] font-semibold">{t('cart.total')}</p>
          <p className="font-display text-[20px] font-bold">{formatPrice(total)}</p>
        </div>
        <p className="text-[12px] text-hc-n-500">{t('cart.ivaIncluido')}</p>
        {consentimiento}
        <button type="button" onClick={onContinuar} disabled={botonDeshabilitado} className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-[18px] py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50">
          {textoBoton ?? t('cart.continuar')}
        </button>
        {onWhatsApp && (
          <button type="button" onClick={onWhatsApp} className="flex items-center justify-center gap-[6px] text-[13px] font-medium text-hc-n-600 hover:text-hc-n-900">
            <img src={ICONOS_CHECKOUT.whatsapp} alt="" width={14} height={14} />
            {t('cart.whatsapp')}
          </button>
        )}
        <p className="text-[11px] leading-[15px] text-hc-n-500">{t('cart.notaResumenEscritorio')}</p>
        <p className="flex items-center justify-center gap-[6px] text-[12px] text-hc-n-500">
          <IconoFigma src={ICONOS_CHECKOUT.pagoProtegido} size={14} className="text-hc-success" />
          {t('cart.pagoProtegido')}
        </p>
      </aside>
    )
  }

  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]">
      <div className="flex items-center justify-between text-[14px] text-hc-n-900">
        <p className="font-medium">{t('cart.productosLinea', { count: unidades })}</p>
        <p className="font-semibold">{formatPrice(subtotal)}</p>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDetalleAbierto((v) => !v)}
          aria-expanded={detalleAbierto}
          aria-label={t('cart.detalleEnvio')}
          className="flex items-center gap-1 text-[14px] font-medium text-hc-n-900"
        >
          {t('cart.envioLinea', { count: paquetes.length })}
          <IconoFigma src={ICONOS_CHECKOUT.resumenChevron} size={14} className={`text-hc-blue-600 transition-transform ${detalleAbierto ? '' : 'rotate-180'}`} />
        </button>
        <p className="text-[14px] font-semibold text-hc-n-900">{formatPrice(envio)}</p>
      </div>
      {detalleAbierto && (
        <div className="flex flex-col gap-1 border-l-2 border-hc-n-200 pl-3 text-[12px] text-hc-n-500">
          {paquetes.map((paquete) => (
            <div key={paquete.clave} className="flex items-center justify-between">
              <p>{paquete.negocio}</p>
              <p>{formatPrice(paquete.envio)}</p>
            </div>
          ))}
        </div>
      )}
      {descuento > 0 && <LineaRebaja etiqueta={t('checkout.codigo.lineaDescuento', { porcentaje: cuponPorcentaje })} monto={descuento} clase="text-[14px]" />}
      {giftCard > 0 && <LineaRebaja etiqueta={t('cart.giftCardLinea')} monto={giftCard} clase="text-[14px]" />}
      <div className="h-px bg-hc-n-200" />
      <div className="flex items-center justify-between font-display font-bold text-hc-n-900">
        <p className="text-[16px]">{t('cart.totalEstimado')}</p>
        <p className="text-[18px]">{formatPrice(total)}</p>
      </div>
      <p className="text-[11px] leading-[15px] text-hc-n-500">{t('cart.notaResumen')}</p>
    </section>
  )
}
