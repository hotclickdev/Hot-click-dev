import { Navigate } from 'react-router-dom'

/** El checkout de compra es el real, no la maqueta Figma. */
export default function VisitanteCheckoutPage() {
  return <Navigate to="/checkout" replace />
}
