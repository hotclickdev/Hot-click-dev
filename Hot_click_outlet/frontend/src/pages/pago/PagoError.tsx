import { useNavigate } from 'react-router-dom'
import FalloPago from './FalloPago'

type PagoErrorProps = {
  error: string | null
  numeroPedido: string | null
}

/**
 * Pago fallido o error al registrar el pedido. Misma pantalla que el pago cancelado (Figma `29:1999`).
 * El bloque de chat "Soporte de pago" no está en Figma: la ayuda es el botón "Contactar soporte" del frame.
 */
export default function PagoError({ error, numeroPedido }: PagoErrorProps) {
  const navigate = useNavigate()
  return (
    <FalloPago
      motivo={error ?? undefined}
      numeroPedido={numeroPedido ?? ''}
      onReintentar={() => navigate('/checkout')}
    />
  )
}
