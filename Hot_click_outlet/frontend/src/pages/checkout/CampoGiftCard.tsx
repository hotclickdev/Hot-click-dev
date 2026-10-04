import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import { ICONOS_COMPRA } from './iconosCompra'
import type { EstadoGiftCard } from './useGiftCardCompra'

/** Tarjeta de regalo, junto al cupón y con el mismo estilo (`37:1640`); solo con sesión. */
export default function CampoGiftCard({ giftCard }: { giftCard: EstadoGiftCard }) {
  const { t } = useTranslation()
  if (!giftCard.disponible) return null

  if (giftCard.aplicada) {
    return (
      <div className="flex items-center gap-[10px]">
        <p className="flex min-w-0 flex-1 items-center gap-[8px] rounded-[12px] border border-hc-green-600 bg-hc-green-50 p-[12px] text-[14px] font-semibold text-hc-success-text">
          <IconoFigma src={ICONOS_COMPRA.cupon} size={16} />
          {t('compra.giftCard.aplicada', { codigo: giftCard.aplicada.codigo, saldo: formatPrice(giftCard.aplicada.saldo) })}
        </p>
        <button type="button" onClick={giftCard.quitar} className="text-[14px] font-semibold text-hc-blue-600">
          {t('compra.cupon.quitar')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <form
        className="flex items-center gap-[10px]"
        onSubmit={(evento) => {
          evento.preventDefault()
          void giftCard.validar()
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-[8px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-[12px] text-hc-n-600">
          <IconoFigma src={ICONOS_COMPRA.cupon} size={16} />
          <input
            value={giftCard.input}
            onChange={(evento) => giftCard.setInput(evento.target.value.toUpperCase())}
            placeholder={t('compra.giftCard.placeholder')}
            aria-label={t('compra.giftCard.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
          />
        </label>
        <button
          type="submit"
          disabled={giftCard.estado === 'loading' || !giftCard.input.trim()}
          className="text-[14px] font-semibold text-hc-blue-600 disabled:opacity-50"
        >
          {giftCard.estado === 'loading' ? t('compra.cupon.validando') : t('compra.cupon.aplicar')}
        </button>
      </form>
      {giftCard.estado === 'invalid' ? <p role="alert" className="text-[12px] text-hc-red-600">{t('compra.giftCard.invalida')}</p> : null}
    </div>
  )
}
