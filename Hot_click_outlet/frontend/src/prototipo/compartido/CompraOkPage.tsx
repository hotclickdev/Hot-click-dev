import { Navigate } from 'react-router-dom'

/** Confirmación de pago real, sin SKU mock. */
export default function CompraOkPage() {
  return <Navigate to="/pago/exito" replace />
}
