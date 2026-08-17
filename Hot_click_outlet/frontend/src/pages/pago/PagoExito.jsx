import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { formatPrice } from '@/utils/format'
import AIPostPaySection from '@/components/ai/AIPostPaySection'

function PagoExitoResumen({ pagoData, t }) {
  if (!pagoData) return null
  return (
    <div className="bg-white/5 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
      <div className="flex justify-between">
        <span className="text-[#8e8e9a]">{t('payment.orderNumber')}</span>
        <span className="text-[#e8e8ed] font-mono font-medium">{pagoData.numeroPedido}</span>
      </div>
      {pagoData.total && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Total pagado</span>
          <span className="text-[#4f7cff] font-bold">{formatPrice(pagoData.total)}</span>
        </div>
      )}
      {pagoData.metodoPago && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Método</span>
          <span className="text-[#e8e8ed]">{pagoData.metodoPago}</span>
        </div>
      )}
      {pagoData.cardLast4 && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Tarjeta</span>
          <span className="text-[#e8e8ed]">{pagoData.cardBrand} •••• {pagoData.cardLast4}</span>
        </div>
      )}
    </div>
  )
}

function PagoExitoAcciones({ token, t }) {
  return (
    <div className="flex flex-col gap-3">
      {token ? (
        <Link
          to="/mis-pedidos"
          className="inline-block w-full py-3 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm transition-all text-center"
        >
          Ver mis pedidos
        </Link>
      ) : (
        <a
          href="https://wa.me/50686667888"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-all text-center"
        >
          📱 Consultar mi pedido por WhatsApp
        </a>
      )}
      <Link
        to="/"
        className="inline-block w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center"
      >
        {t('payment.home')}
      </Link>
      {!token && (
        <Link
          to="/registro"
          className="text-xs text-center text-[#4f7cff] hover:underline"
        >
          Crear cuenta para ver el historial de pedidos →
        </Link>
      )}
    </div>
  )
}

/**
 * Confirmación visual de pago exitoso.
 * @param {{ pagoData: object | null, numeroPedido: string | null, token: string | null }} props
 */
export default function PagoExito({ pagoData, numeroPedido, token }) {
  const { t } = useTranslation()
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

          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-2">{t('payment.success')}</h1>
          <p className="text-[#8e8e9a] text-sm mb-6">{t('payment.successSub')}</p>

          <PagoExitoResumen pagoData={pagoData} t={t} />

          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 text-sm text-center mb-4">
            <span className="text-emerald-400 font-medium">🛡 Tu garantía de 40 días está activa</span>
            <p className="text-[#8e8e9a] text-xs mt-1">
              Si tienes cualquier problema, contáctanos por WhatsApp.
            </p>
          </div>

          <AIPostPaySection
            tipo="success"
            numeroPedido={pagoData?.numeroPedido || numeroPedido || ''}
            metodoPago={pagoData?.metodoPago || ''}
          />

          <p className="text-xs text-[#8e8e9a] mb-6 mt-4">
            Recibirás un correo de confirmación. ¿Tienes dudas? Contáctanos por WhatsApp.
          </p>

          <PagoExitoAcciones token={token} t={t} />
        </motion.div>
      </div>
    </MainLayout>
  )
}
