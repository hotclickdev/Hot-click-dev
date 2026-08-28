import { Navigate } from 'react-router-dom'

/** Historial de pedidos real (login si hace falta). */
export default function VisitantePedidosPage() {
  return <Navigate to="/mis-pedidos" replace />
}
