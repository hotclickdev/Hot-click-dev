import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { formatColones } from './posPagoFormat'

type Props = {
  monto: number
  onClick: () => void
  cargando?: boolean
  disabled?: boolean
  avisoKey: 'pos.pago.hostedAviso' | 'pos.pago.walletsAviso'
}

export default function PosPagoCta({ monto, onClick, cargando, disabled, avisoKey }: Props) {
  const { t } = useTranslation()

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <button
        type="button"
        disabled={disabled || cargando}
        onClick={onClick}
        className="hc-btn-primary flex items-center justify-center w-full min-h-12 rounded-2xl px-5 py-4 text-[15px] font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-focus-ring)]"
        style={{ boxShadow: '0 10px 24px color-mix(in srgb, var(--hc-primary) 28%, transparent)' }}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <TrustGlyph tipo="pago" className="size-4 shrink-0" />
          {cargando
            ? t('pos.pago.procesando')
            : t('pos.pago.pagar', { monto: formatColones(monto) })}
        </span>
      </button>
      <p className="px-2 text-center text-xs leading-relaxed text-pretty text-[var(--hc-muted)]">
        {t(avisoKey)}
      </p>
    </div>
  )
}
