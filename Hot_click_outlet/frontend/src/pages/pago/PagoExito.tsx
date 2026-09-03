import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import { formatPrice } from '@/utils/format'
import AIPostPaySection from '@/components/ai/AIPostPaySection'
import type { PagoResumen } from './pagoHelpers'
import type { TFunction } from 'i18next'

function PagoExitoResumen({
  pagoData,
  numeroPedido,
  t,
}: {
  pagoData: PagoResumen | null
  numeroPedido: string | null
  t: TFunction
}) {
  const pedidoVisible = pagoData?.numeroPedido || numeroPedido
  if (!pedidoVisible && !pagoData) return null
  return (
    <div className="bg-white/5 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
      {pedidoVisible && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">{t('payment.orderNumber')}</span>
          <span className="text-[#e8e8ed] font-mono font-medium">{pedidoVisible}</span>
        </div>
      )}
      {pagoData?.total && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Total pagado</span>
          <span className="font-bold" style={{ color: 'var(--hc-primary)' }}>{formatPrice(pagoData.total)}</span>
        </div>
      )}
      {pagoData?.metodoPago && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Método</span>
          <span className="text-[#e8e8ed]">{pagoData.metodoPago}</span>
        </div>
      )}
      {pagoData?.cardLast4 && (
        <div className="flex justify-between">
          <span className="text-[#8e8e9a]">Tarjeta</span>
          <span className="text-[#e8e8ed]">{pagoData.cardBrand} •••• {pagoData.cardLast4}</span>
        </div>
      )}
    </div>
  )
}

function PagoExitoAcciones({
  token,
  t,
}: {
  token: string | null
  t: TFunction
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => window.print()}
        className="hc-btn w-full min-h-11 border border-white/15 text-[#e8e8ed] hover:border-white/30"
      >
        {t('payment.print', 'Imprimir')}
      </button>
      {token ? (
        <Link to="/mis-pedidos" className="hc-btn hc-btn-primary w-full min-h-11">
          Ver mis pedidos
        </Link>
      ) : (
        <Link to="/productos" className="hc-btn hc-btn-primary w-full min-h-11">
          {t('checkout.continueShopping')}
        </Link>
      )}
      <Link
        to="/"
        className="inline-block w-full py-3 rounded-xl border border-white/10 hover:border-white/20 text-[#8e8e9a] hover:text-[#e8e8ed] font-medium text-sm transition-all text-center min-h-11"
      >
        {t('payment.home')}
      </Link>
      {!token && (
        <>
          <a
            href="https://wa.me/50686667888"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Consultar mi pedido por WhatsApp"
            className="flex items-center justify-center min-h-11 text-sm font-medium"
            style={{ color: 'var(--hc-muted)' }}
          >
            Consultar mi pedido por WhatsApp
          </a>
          <Link
            to="/registro"
            className="text-xs text-center hover:underline"
            style={{ color: 'var(--hc-link)' }}
          >
            Crear cuenta para ver el historial de pedidos
          </Link>
        </>
      )}
    </div>
  )
}

type PagoExitoProps = {
  pagoData: PagoResumen | null
  numeroPedido: string | null
  token: string | null
}

/**
 * Confirmación visual de pago exitoso.
 */
export default function PagoExito({ pagoData, numeroPedido, token }: PagoExitoProps) {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">
        <CheckoutStepper activeStep="confirm" />
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

          <PagoExitoResumen pagoData={pagoData} numeroPedido={numeroPedido} t={t} />

          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 text-sm text-center mb-4">
            <span className="text-emerald-400 font-medium inline-flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Tu garantía de 40 días está activa
            </span>
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
