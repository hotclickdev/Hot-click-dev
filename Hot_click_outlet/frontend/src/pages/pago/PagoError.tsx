import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import AIPostPaySection from '@/components/ai/AIPostPaySection'
import TrustGlyph from '@/components/ui/TrustGlyph'

type PagoErrorProps = {
  error: string | null
  numeroPedido: string | null
}

/**
 * Pago fallido o error al registrar el pedido.
 */
export default function PagoError({ error, numeroPedido }: PagoErrorProps) {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400">
            <TrustGlyph tipo="error" className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">Pago no completado</h1>
          <p className="text-[#8e8e9a] text-sm mb-2">
            {error || 'Tu tarjeta no fue cargada. Puedes intentarlo nuevamente.'}
          </p>
          <AIPostPaySection
            tipo="failed"
            numeroPedido={numeroPedido || ''}
            errorCode={error || ''}
          />

          <div className="flex flex-col gap-3 mt-4">
            <Link to="/checkout" className="hc-btn hc-btn-primary w-full min-h-11">
              {t('payment.retry')}
            </Link>
            <Link to="/carrito" className="w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center">
              {t('checkout.backToCart')}
            </Link>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
