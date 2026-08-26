import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { tituloPendiente, subtituloPendiente } from './pagoHelpers'

/**
 * Timeout: el pago sigue en revisión (webhook lento o Stripe ya aprobado).
 * @param {{ pagoData: object | null, stripeApproved: boolean }} props
 */
export default function PagoPendiente({ pagoData, stripeApproved }) {
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">
            {tituloPendiente(stripeApproved)}
          </h1>
          <p className="text-[#8e8e9a] text-sm mb-2">
            {subtituloPendiente(stripeApproved)}
          </p>
          <p className="text-xs text-[#8e8e9a] mb-6">
            Si no recibes confirmación en 15 minutos, contáctanos por WhatsApp con el número de pedido.
          </p>

          {pagoData?.numeroPedido && (
            <div className="bg-white/5 rounded-xl p-3 text-sm mb-6">
              <span className="text-[#8e8e9a]">Pedido: </span>
              <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link to="/mis-pedidos" className="hc-btn hc-btn-primary w-full min-h-11">
              Ver mis pedidos
            </Link>
            <a
              href="https://wa.me/50686667888"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contactar soporte por WhatsApp"
              className="flex items-center justify-center min-h-11 text-sm font-medium"
              style={{ color: 'var(--hc-muted)' }}
            >
              Contactar soporte por WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
