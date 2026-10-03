import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CargaComprador from '@/components/comprador/estados/CargaComprador'
import { MarcoPago } from './PiezasPago'
import { BENEFITS, mensajeCargaPago } from './pagoHelpers'

type PagoLoadingProps = {
  estado: string
  stripeApproved: boolean
}

/**
 * Pantalla de espera mientras se verifica o captura el pago (derivado de Figma: marco de pago `29:1932`,
 * círculo de estado, barra azul y tarjeta clara con el beneficio rotativo).
 */
export default function PagoLoading({ estado, stripeApproved }: PagoLoadingProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [benefitIdx, setBenefitIdx] = useState(0)

  // Barra de progreso: llega a 85% mientras espera, salta a 100% al completar
  useEffect(() => {
    const target = estado === 'capturing' ? 60 : 85
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= target) { clearInterval(interval); return p }
        const step = (target - p) * 0.04
        return Math.min(p + Math.max(step, 0.3), target)
      })
    }, 120)
    return () => clearInterval(interval)
  }, [estado])

  // Rotación de beneficios cada 3s
  useEffect(() => {
    const id = setInterval(() => setBenefitIdx(i => (i + 1) % BENEFITS.length), 3000)
    return () => clearInterval(id)
  }, [])

  const benefit = BENEFITS[benefitIdx]

  return (
    <MarcoPago>
      <CargaComprador titulo={t('payment.carga.gracias')} texto={mensajeCargaPago(estado, stripeApproved, t)}>
        <div className="flex w-full flex-col gap-4">
          <div>
            <div className="h-1 w-full overflow-hidden rounded-[2px] bg-hc-n-200">
              <div className="h-full rounded-[2px] bg-hc-blue-600 transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[12px] leading-4 text-hc-n-600">{t('payment.carga.puedeTardar')}</p>
          </div>
          <div key={benefitIdx} className="flex min-h-[64px] items-center gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 text-left">
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
              <TrustGlyph tipo={benefit.icono} className="size-[18px]" />
            </span>
            <span className="text-[13px] font-medium leading-[18px] text-hc-n-900">{t(benefit.clave)}</span>
          </div>
        </div>
      </CargaComprador>
    </MarcoPago>
  )
}
