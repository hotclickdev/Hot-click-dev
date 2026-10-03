import { useTranslation } from 'react-i18next'
import type { PlanPublico } from '@/services/negocioService'
import { ETIQUETA_PLAN } from './negociosPublicos'

const ESTILO: Record<PlanPublico, string> = {
  EMPRENDEDOR: 'bg-hc-n-100 text-hc-n-600',
  PYME: 'bg-hc-blue-50 text-hc-blue-600',
  NEGOCIO_PLUS: 'bg-hc-blue-600 text-hc-n-0',
}

/** Pill del plan público del negocio (radio 999, 11/semibold). */
export default function InsigniaPlan({ plan, className = '' }: { plan: PlanPublico; className?: string }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-[2px] text-[11px] font-semibold leading-[14px] ${ESTILO[plan] ?? ESTILO.EMPRENDEDOR} ${className}`}>
      {t(ETIQUETA_PLAN[plan] ?? ETIQUETA_PLAN.EMPRENDEDOR)}
    </span>
  )
}
