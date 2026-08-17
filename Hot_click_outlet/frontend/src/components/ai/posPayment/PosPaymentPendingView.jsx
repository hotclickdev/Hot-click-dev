import { motion } from 'framer-motion'
import { fmt, SINPE_NUMERO, SINPE_TITULAR } from './posPaymentConstants'
import PosPaymentRow from './PosPaymentRow'

/**
 * Instrucciones SINPE o confirmación de pedido (efectivo / SINPE success).
 */
export default function PosPaymentPendingView({
  metodo,
  isSuccess,
  pagoData,
  totalFinal,
  onWhatsApp,
  onClose,
}) {
  const isSinpePend = metodo === 'SINPE' && !isSuccess

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 py-2"
    >
      {isSinpePend ? (
        <>
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs font-bold" style={{ color: '#22c55e' }}>
              ¡Pedido #{pagoData?.numeroPedido ?? '—'} creado!
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-text)' }}>
              Realizá la transferencia SINPE para confirmar:
            </p>
            <div className="space-y-1.5">
              <PosPaymentRow label="Número" value={SINPE_NUMERO} />
              <PosPaymentRow label="Titular" value={SINPE_TITULAR} />
              <PosPaymentRow label="Monto" value={`₡${fmt(totalFinal)}`} bold />
            </div>
          </div>
          <button type="button"
            onClick={onWhatsApp}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            style={{ background: '#25d366', color: '#fff' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.526 5.845L.057 23.882a.5.5 0 00.611.611l6.037-1.469A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.961 0-3.791-.535-5.352-1.464l-.384-.228-3.981.968.987-3.882-.25-.4A9.773 9.773 0 012.182 12C2.182 6.56 6.56 2.182 12 2.182c5.44 0 9.818 4.378 9.818 9.818 0 5.44-4.378 9.818-9.818 9.818z"/>
            </svg>
            Enviar comprobante por WhatsApp
          </button>
          <button type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-medium"
            style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
          >
            Cerrar — te avisamos cuando confirmemos
          </button>
        </>
      ) : (
        // EFECTIVO confirmado o SINPE success
        <div className="rounded-2xl p-5 text-center space-y-3"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="text-3xl">🎉</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            ¡Pedido #{pagoData?.numeroPedido ?? '—'} confirmado!
          </p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {metodo === 'EFECTIVO'
              ? 'Pagás en efectivo al recibir tu pedido.'
              : 'Pago recibido. Coordinamos la entrega pronto.'}
          </p>
          <button type="button" onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold mt-2"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            Seguir viendo productos
          </button>
        </div>
      )}
    </motion.div>
  )
}
