import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'

// Tiempo de espera antes de hacer polling (da chance al webhook de llegar)
const DELAY_VERIFICACION_MS = 2500

export default function PaymentStatusPage() {
  const [params]     = useSearchParams()
  const numeroPedido = params.get('order')
  const { clearCart } = useCartStore()
  const { estado, pagoData, error, verificarEstado } = usePayment()
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (!numeroPedido) return

    const timer = setTimeout(async () => {
      setPolling(true)
      const data = await verificarEstado(numeroPedido)
      setPolling(false)
      // Si el pago fue exitoso, limpiar el carrito
      if (data?.estadoPago === 'CAPTURADO') {
        clearCart()
      }
    }, DELAY_VERIFICACION_MS)

    return () => clearTimeout(timer)
  }, [numeroPedido])

  // Pantalla de carga inicial
  if (estado === 'idle' || estado === 'polling' || polling) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">Verificando tu pago…</p>
          <p className="text-[#8e8e9a] text-sm">Esto puede tardar unos segundos</p>
        </div>
      </MainLayout>
    )
  }

  // Pago exitoso
  if (estado === 'success') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">¡Pago exitoso!</h1>
            <p className="text-[#8e8e9a] text-sm mb-6">Tu pedido ha sido confirmado y está siendo procesado.</p>

            {pagoData && (
              <div className="bg-white/5 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-[#8e8e9a]">Pedido</span>
                  <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
                </div>
                {pagoData.total && (
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Total pagado</span>
                    <span className="text-[#4f7cff] font-bold">{formatPrice(pagoData.total)}</span>
                  </div>
                )}
                {pagoData.cardLast4 && (
                  <div className="flex justify-between">
                    <span className="text-[#8e8e9a]">Tarjeta</span>
                    <span className="text-[#e8e8ed]">{pagoData.cardBrand} •••• {pagoData.cardLast4}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-[#8e8e9a] mb-6">
              Recibirás un correo de confirmación. Si tienes dudas contáctanos por WhatsApp.
            </p>

            <Link
              to="/"
              className="inline-block w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
            >
              Volver al inicio
            </Link>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // Pago cancelado
  if (estado === 'cancelled') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">Pago cancelado</h1>
            <p className="text-[#8e8e9a] text-sm mb-6">
              Cancelaste el proceso de pago. Tu carrito sigue disponible.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                to="/checkout"
                className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
              >
                Intentar de nuevo
              </Link>
              <Link
                to="/carrito"
                className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center"
              >
                Volver al carrito
              </Link>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  // Pago fallido o error
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">Pago no completado</h1>
          <p className="text-[#8e8e9a] text-sm mb-2">
            {error || 'Tu tarjeta no fue cargada. Puedes intentarlo nuevamente.'}
          </p>
          <p className="text-xs text-[#8e8e9a] mb-6">
            Si el problema persiste, contáctanos a{' '}
            <a href="mailto:soporte@hotclick.com" className="text-[#4f7cff] hover:underline">
              soporte@hotclick.com
            </a>
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to="/checkout"
              className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
            >
              Intentar de nuevo
            </Link>
            <Link
              to="/carrito"
              className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center"
            >
              Volver al carrito
            </Link>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
