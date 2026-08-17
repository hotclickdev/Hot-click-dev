import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

/** Pantalla cuando el usuario canceló el pago en el proveedor. */
export default function PagoCancelado() {
  const { t } = useTranslation()
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
          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">{t('payment.cancelled')}</h1>
          <p className="text-[#8e8e9a] text-sm mb-6">{t('payment.cancelledSub')}</p>
          <div className="flex flex-col gap-3">
            <Link to="/checkout" className="w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center">
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
