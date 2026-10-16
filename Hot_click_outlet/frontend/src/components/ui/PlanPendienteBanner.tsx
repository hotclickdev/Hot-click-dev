import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useTranslation } from 'react-i18next'
import { clavePlanPendiente, planPorCompletar } from './planPendiente'

/** Plan nuevo elegido sin pagar: «Completá el pago» lleva a la pantalla de planes (neutral de pasarela). */
export default function PlanPendienteBanner({ rutaPlan }: { rutaPlan: string }) {
  const { t } = useTranslation()
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    api.get('/billing/plan-pendiente')
      .then(({ data }) => { if (vivo) setPlan(planPorCompletar(data)) })
      .catch(() => { /* sin aviso */ })
    return () => { vivo = false }
  }, [])

  if (!plan) return null
  return (
    <div
      className="w-full px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 text-sm text-center"
      style={{ background: 'var(--hc-warning-bg, #FDF3DC)', color: 'var(--hc-warning, #9A6700)', borderBottom: '1px solid var(--hc-border)' }}
      role="status"
    >
      <span>{t(clavePlanPendiente(plan))}</span>
      <Link to={rutaPlan} className="font-semibold underline">{t('planPendiente.cta')}</Link>
    </div>
  )
}
