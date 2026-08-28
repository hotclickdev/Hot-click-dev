import { useNavigate } from 'react-router-dom'
import useTenantStore from '@/store/tenantStore'
import useAuthStore from '@/store/authStore'

const BANNER_ROLES = new Set(['EMPRENDEDOR', 'ADMIN'])

/**
 * Banner de trial / plan vencido.
 * Se muestra en AdminLayout cuando:
 *   - estadoPlan === 'TRIAL' y quedan ≤ 7 días
 *   - estadoPlan === 'VENCIDO' o 'PAST_DUE'
 * Solo visible para roles EMPRENDEDOR y ADMIN.
 */
export default function TrialBanner() {
  const { estadoPlan, trialDias, planNombre } = useTenantStore()
  const userRole = useAuthStore((s) => s.userRole)
  const navigate = useNavigate()

  if (!userRole || !BANNER_ROLES.has(userRole)) return null

  const esVencido  = estadoPlan === 'VENCIDO' || estadoPlan === 'PAST_DUE'
  const esTrial    = estadoPlan === 'TRIAL'
  const pocosTrial = esTrial && trialDias >= 0 && trialDias <= 7

  if (!esVencido && !pocosTrial) return null

  const bg      = esVencido ? '#7f1d1d' : '#78350f'
  const border  = esVencido ? '#b91c1c' : '#d97706'
  const accent  = esVencido ? '#fca5a5' : '#fde68a'

  let mensaje = ''
  if (estadoPlan === 'PAST_DUE') {
    mensaje = 'Pago pendiente — actualiza tu método de pago para continuar usando el plan'
  } else if (esVencido) {
    mensaje = `Tu trial de ${planNombre} ha vencido. Suscríbete para seguir usando todas las funciones.`
  } else if (trialDias === 0) {
    mensaje = `Tu trial vence hoy. Suscríbete ahora para no perder el acceso.`
  } else {
    mensaje = `Trial activo — te quedan ${trialDias} día${trialDias === 1 ? '' : 's'}.`
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{ backgroundColor: bg, borderBottom: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 shrink-0" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span style={{ color: '#fff' }} className="truncate">{mensaje}</span>
      </div>
      <button type="button"
        onClick={() => navigate('/admin/billing/planes')}
        className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ backgroundColor: accent, color: '#1a1a1a' }}
      >
        {estadoPlan === 'PAST_DUE' ? 'Actualizar pago' : 'Ver planes'}
      </button>
    </div>
  )
}
