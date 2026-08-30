import { Link, useLocation } from 'react-router-dom'
import CheckoutChrome from './CheckoutChrome'
import { hrefPedidosCheckout, usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'

type PagoGiftCard = {
  numeroPedido?: string
}

type CheckoutPaidGiftCardProps = {
  pagoData: PagoGiftCard | null
}

export default function CheckoutPaidGiftCard({ pagoData }: CheckoutPaidGiftCardProps) {
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div className="max-w-lg mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>¡Pedido confirmado!</p>
          <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>Tu pedido fue pagado en su totalidad con la gift card.</p>
        </div>
        {pagoData?.numeroPedido && (
          <div className="rounded-2xl p-5 w-full" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Número de pedido</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>{pagoData.numeroPedido}</p>
          </div>
        )}
        <Link to={hrefPedidosCheckout(skinVisitante)} className="hc-btn hc-btn-primary min-h-11">
          Ver mis pedidos
        </Link>
      </div>
    </CheckoutChrome>
  )
}
