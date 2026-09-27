import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { SINPE_NUMERO, copiarNumeroSinpe } from './checkoutHelpers'
import { ICONOS_COMPRA } from './iconosCompra'

type InstruccionesSinpeProps = {
  monto: number
  comprobante: File | null
  onComprobante: (archivo: File | null) => void
  error?: string
}

/** Instrucciones de SINPE Móvil y subida del comprobante (Figma `29:1344`). */
export default function InstruccionesSinpe({ monto, comprobante, onComprobante, error }: InstruccionesSinpeProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const input = useRef<HTMLInputElement | null>(null)

  async function copiar() {
    const copiado = await copiarNumeroSinpe()
    toast({ message: copiado ? t('compra.pago.numeroCopiado') : t('compra.pago.numeroNoCopiado'), type: copiado ? 'success' : 'error' })
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] bg-hc-n-0 p-[12px] lg:border lg:border-hc-n-200">
      <div className="flex flex-wrap items-center gap-[6px]">
        <p className="text-[13px] text-hc-n-600">{t('compra.pago.sinpePaso1', { monto: formatPrice(monto) })}</p>
        <p className="font-display text-[15px] font-bold text-hc-n-900">{SINPE_NUMERO}</p>
        <button type="button" onClick={() => void copiar()} aria-label={t('compra.pago.copiarNumero')} className="flex text-hc-blue-600">
          <IconoFigma src={ICONOS_COMPRA.copiar} size={16} />
        </button>
      </div>
      <p className="text-[13px] leading-[18px] text-hc-n-600">{t('compra.pago.sinpePasos23')}</p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        aria-label={t('compra.pago.subirComprobante')}
        onChange={(evento) => onComprobante(evento.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`flex items-center justify-center gap-[8px] rounded-[10px] border-[1.5px] border-dashed bg-hc-n-50 py-[12px] text-[14px] font-semibold text-hc-blue-600 ${error ? 'border-hc-red-500' : 'border-hc-blue-600'}`}
      >
        <IconoFigma src={comprobante ? ICONOS_COMPRA.check : ICONOS_COMPRA.subir} size={18} />
        <span className="min-w-0 truncate">
          {comprobante ? t('compra.pago.comprobanteListo', { nombre: comprobante.name }) : t('compra.pago.subirComprobante')}
        </span>
      </button>
      {error ? <p role="alert" className="text-[12px] text-hc-red-600">{error}</p> : null}
    </div>
  )
}
