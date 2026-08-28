import { Navigate } from 'react-router-dom'

/** Pago rechazado: misma pantalla de producción. */
export default function VisitantePagoFallidoPage() {
  return <Navigate to="/pago/cancelado" replace />
}
