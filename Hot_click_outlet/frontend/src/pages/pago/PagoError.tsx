import { useNavigate } from 'react-router-dom'
import AIPostPaySection from '@/components/ai/AIPostPaySection'
import FalloPago from './FalloPago'

type PagoErrorProps = {
  error: string | null
  numeroPedido: string | null
}

/**
 * Pago fallido o error al registrar el pedido. Misma pantalla que el pago cancelado (Figma `29:1999`).
 */
export default function PagoError({ error, numeroPedido }: PagoErrorProps) {
  const navigate = useNavigate()
  return (
    <FalloPago
      motivo={error ?? undefined}
      numeroPedido={numeroPedido ?? ''}
      onReintentar={() => navigate('/checkout')}
      extra={(
        <div className="px-4 pb-6">
          <AIPostPaySection tipo="failed" numeroPedido={numeroPedido || ''} errorCode={error || ''} />
        </div>
      )}
    />
  )
}
