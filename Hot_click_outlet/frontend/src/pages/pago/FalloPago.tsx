import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import { leerUltimoPedido } from '@/utils/ultimoPedido'
import { WHATSAPP } from '@/pages/checkout/checkoutHelpers'
import { ICONOS_PAGO } from './iconosPago'
import { BotonPago, IconoEstado, MarcoPago } from './PiezasPago'

type FalloPagoProps = {
  /** Motivo que devolvió el proveedor, si lo hay. */
  motivo?: string
  numeroPedido: string
  onReintentar?: () => void
  reintentando?: boolean
  /** Contenido extra bajo las acciones (p. ej. el asistente de post-pago). */
  extra?: ReactNode
}

/** Pago fallido o cancelado: Figma `29:1999` (móvil). Sin frame de escritorio: misma columna centrada. */
export default function FalloPago({ motivo, numeroPedido, onReintentar, reintentando, extra }: FalloPagoProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const ultimo = leerUltimoPedido()
  const textoWa = encodeURIComponent(t('payment.fallo.whatsappTexto', { pedido: numeroPedido }))
  const productos = ultimo?.unidades
  const consejos = [t('payment.fallo.consejo1'), t('payment.fallo.consejo2'), t('payment.fallo.consejo3')]

  return (
    <MarcoPago>
      <div className="flex flex-col items-center gap-[10px] px-4 pb-[13px] pt-8 text-center leading-[normal]">
        <IconoEstado src={ICONOS_PAGO.falloEquis} tamano={34} circulo={72} clase="bg-hc-danger-bg text-hc-danger" />
        <h1 className="font-display text-[19px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('payment.fallo.titulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{motivo ? `${motivo}. ${t('payment.fallo.sinCobro')}.` : t('payment.fallo.texto')}</p>
      </div>

      <section className="px-4 py-2">
        <div className="flex flex-col gap-[10px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
          <h2 className="font-sans text-[15px] font-semibold tracking-normal text-hc-n-900">{t('payment.fallo.queHacer')}</h2>
          {consejos.map((consejo) => <p key={consejo} className="text-[13px] leading-[19px] text-hc-n-600">{`• ${consejo}`}</p>)}
        </div>
      </section>

      <div className="flex flex-col gap-[10px] px-4 pb-[10px] pt-3">
        {onReintentar && (
          <BotonPago variante="primario" onClick={onReintentar} disabled={reintentando}>
            <IconoFigma src={ICONOS_PAGO.falloReintentar} size={18} />
            {reintentando ? t('payment.retrying') : t('payment.fallo.reintentar')}
          </BotonPago>
        )}
        <BotonPago variante="secundario" onClick={() => navigate('/checkout')}>
          <IconoFigma src={ICONOS_PAGO.falloCambiarMetodo} size={18} className="text-hc-n-900" />
          {t('payment.fallo.cambiarMetodo')}
        </BotonPago>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${textoWa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-center gap-2 text-[14px] font-semibold leading-[normal] text-hc-blue-600 after:absolute after:-inset-y-3 after:inset-x-0"
        >
          <IconoFigma src={ICONOS_PAGO.falloSoporte} size={16} />
          {t('payment.fallo.soporte')}
        </a>
      </div>

      {numeroPedido && (
        <section className="px-4 pb-6 pt-[10px]">
          <div className="flex items-center justify-between gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
            <p className="text-[13px] text-hc-n-600">
              {productos ? t('payment.fallo.pedidoProductos', { pedido: numeroPedido, count: productos }) : t('payment.fallo.pedido', { pedido: numeroPedido })}
            </p>
            {ultimo?.total ? <p className="font-display text-[15px] font-bold text-hc-n-900">{formatPrice(ultimo.total)}</p> : null}
          </div>
        </section>
      )}
      {extra}
    </MarcoPago>
  )
}
