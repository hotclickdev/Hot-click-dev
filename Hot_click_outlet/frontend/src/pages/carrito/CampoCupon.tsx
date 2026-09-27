import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import type { EstadoCupon } from '@/pages/checkout/useCupon'

type CampoCuponProps = {
  cupon: EstadoCupon
  className?: string
}

/** Cupón del carrito (Figma `37:1640`): código y «Aplicar»; con cupón válido, «Quitar». */
export default function CampoCupon({ cupon, className = '' }: CampoCuponProps) {
  const { t } = useTranslation()

  if (cupon.cupon) {
    return (
      <div className={`flex items-center gap-[10px] ${className}`}>
        <p className="flex min-w-0 flex-1 items-center gap-[8px] rounded-[12px] border border-hc-green-600 bg-hc-green-50 p-[12px] text-[14px] font-semibold text-hc-green-600">
          <IconoFigma src={ICONOS_COMPRA.cupon} size={16} />
          {t('compra.cupon.aplicado', { codigo: cupon.cupon.codigo })}
        </p>
        <button type="button" onClick={cupon.quitar} className="text-[14px] font-semibold text-hc-blue-600">
          {t('compra.cupon.quitar')}
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <form
        className="flex items-center gap-[10px]"
        onSubmit={(evento) => {
          evento.preventDefault()
          void cupon.validar()
        }}
      >
        <label className="flex min-w-0 flex-1 items-center gap-[8px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-[12px] text-hc-n-500">
          <IconoFigma src={ICONOS_COMPRA.cupon} size={16} />
          <input
            value={cupon.input}
            onChange={(evento) => cupon.setInput(evento.target.value.toUpperCase())}
            placeholder={t('compra.cupon.placeholder')}
            aria-label={t('compra.cupon.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
          />
        </label>
        <button
          type="submit"
          disabled={cupon.estado === 'loading' || !cupon.input.trim()}
          className="text-[14px] font-semibold text-hc-blue-600 disabled:opacity-50"
        >
          {cupon.estado === 'loading' ? t('compra.cupon.validando') : t('compra.cupon.aplicar')}
        </button>
      </form>
      {cupon.error ? <p role="alert" className="text-[12px] text-hc-red-600">{cupon.error}</p> : null}
    </div>
  )
}
