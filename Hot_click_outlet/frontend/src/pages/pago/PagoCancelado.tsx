import { useNavigate, useSearchParams } from 'react-router-dom'
import FalloPago from './FalloPago'

/**
 * Pantalla cuando el pago fue cancelado o rechazado en el proveedor (Figma `29:1999`).
 * Reintentar vuelve al checkout: sin pasarela conectada no hay reintento embebido.
 */
export default function PagoCancelado() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const motivo = (params.get('motivo') || params.get('description') || '').trim()
  const numeroPedido = (params.get('order') || params.get('numeroPedido') || '').trim()

  return (
    <FalloPago
      motivo={motivo}
      numeroPedido={numeroPedido}
      onReintentar={() => navigate('/checkout')}
      reintentando={false}
    />
  )
}
