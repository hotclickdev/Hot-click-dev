import { Navigate } from 'react-router-dom'

/** La compra del prototipo vendedor usa el carrito real. */
export default function CarritoPage() {
  return <Navigate to="/carrito" replace />
}
