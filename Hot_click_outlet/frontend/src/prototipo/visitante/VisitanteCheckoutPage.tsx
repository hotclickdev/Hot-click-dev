import { useEffect } from 'react'
import CheckoutPage from '@/pages/CheckoutPage'
import { marcarRetornoPagoVisitante } from './pagoRetornoVisitante'

/**
 * Checkout real bajo VisitanteShell: reutiliza CheckoutPage (mismos APIs de pago).
 * Skin/chrome por pathname `/visitante/*`; marca retorno post-pasarela.
 */
export default function VisitanteCheckoutPage() {
  useEffect(() => {
    marcarRetornoPagoVisitante()
  }, [])
  return <CheckoutPage />
}
