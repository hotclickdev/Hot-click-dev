import { Navigate } from 'react-router-dom'

/** Sin confirmación de SKU mock. */
export default function CompraConfirmadaPage() {
  return <Navigate to="/pago/exito" replace />
}
