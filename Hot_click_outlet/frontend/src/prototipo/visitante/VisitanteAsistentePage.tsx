import { Navigate } from 'react-router-dom'

/** El asistente de compra es el del catálogo real. */
export default function VisitanteAsistentePage() {
  return <Navigate to="/productos?ai=1" replace />
}
