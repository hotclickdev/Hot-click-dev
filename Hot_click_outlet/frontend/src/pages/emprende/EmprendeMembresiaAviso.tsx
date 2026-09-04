import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useTenantStore from '@/store/tenantStore'

const RUTA_PLANES = '/admin/billing/planes'

/** Aviso corto si el negocio quedó sin cupo gratis. */
export default function EmprendeMembresiaAviso() {
  const { t } = useTranslation()
  const estadoPlan = useTenantStore((s) => s.estadoPlan)
  if (estadoPlan !== 'REQUIERE_MEMBRESIA') return null

  return (
    <aside
      className="mb-8 rounded-2xl border px-4 py-4"
      style={{ borderColor: 'var(--hc-primary)', backgroundColor: 'var(--hc-surface)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.membresiaTitle')}
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.membresiaHint')}
      </p>
      <Link
        to={RUTA_PLANES}
        className="inline-flex mt-3 text-sm font-semibold min-h-[44px] items-center"
        style={{ color: 'var(--hc-primary)' }}
      >
        {t('emprende.membresiaCta')}
      </Link>
    </aside>
  )
}
