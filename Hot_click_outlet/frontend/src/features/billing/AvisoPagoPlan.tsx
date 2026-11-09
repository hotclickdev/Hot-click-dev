import { MSG_PAGO_EN_PROCESO } from '@/components/ui/planPendiente'
import type { EstadoActivacion } from './activacionPago'

/** Monto del plan, visible antes de confirmar el cobro. */
export function MontoPlanPago({ monto }: { monto: string | null }) {
  if (!monto) return null
  return (
    <p className="text-sm" style={{ color: 'var(--hc-text)' }}>
      Vas a confirmar <strong>{monto}</strong>.
    </p>
  )
}

/** Estado de la activación después del embed. Nunca dice activo si ONVO no confirmó. */
export function EstadoActivacionPago({ estado }: { estado: EstadoActivacion | null }) {
  if (estado === 'confirmando') {
    return <p className="text-sm" role="status" style={{ color: 'var(--hc-text)' }}>Estamos confirmando tu pago con ONVO. No cierres esta pantalla.</p>
  }
  if (estado === 'pendiente') {
    return <p className="text-sm" role="status" style={{ color: 'var(--hc-text)' }}>{MSG_PAGO_EN_PROCESO}</p>
  }
  return null
}
