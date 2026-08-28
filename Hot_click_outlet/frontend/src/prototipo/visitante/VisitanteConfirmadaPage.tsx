import { Navigate } from 'react-router-dom'

/** Confirmación de pago real: sin pedido mock #4021. */
export default function VisitanteConfirmadaPage() {
  return <Navigate to="/pago/exito" replace />
}
