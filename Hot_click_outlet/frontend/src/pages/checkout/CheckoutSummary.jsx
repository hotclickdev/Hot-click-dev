import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { EfectivoIcon, LockIcon, SinpeIcon } from './checkoutIcons'
import { SINPE_NUMERO } from './checkoutHelpers'

export default function CheckoutSummary({
  items,
  token,
  gcInput,
  setGcInput,
  gcEstado,
  setGcEstado,
  setGcSaldo,
  setGcCodigo,
  gcSaldo,
  gcCodigo,
  validarGiftCard,
  cuponInput,
  setCuponInput,
  cuponEstado,
  setCuponEstado,
  setCuponDescuento,
  setCuponCodigo,
  setCuponError,
  cuponDescuento,
  cuponError,
  validarCupon,
  subtotalCart,
  descuentoMonto,
  gcAplicado,
  costoEnvio,
  totalFinal,
  metodoPago,
  aceptaDatos,
  setAceptaDatos,
  estado,
  intentos,
  maxIntentos,
  onPagar,
}) {
  const { t } = useTranslation()
  const gcInvalidBorder = gcEstado === 'invalid' ? '#f87171' : 'var(--hc-border)'
  const gcBorderColor = gcEstado === 'valid' ? '#10b981' : gcInvalidBorder
  const cuponInvalidBorder = cuponEstado === 'invalid' ? '#f87171' : 'var(--hc-border)'
  const cuponBorderColor = cuponEstado === 'valid' ? '#10b981' : cuponInvalidBorder
  const payMethodIconFallback = metodoPago === 'EFECTIVO' ? <EfectivoIcon selected /> : <LockIcon />
  const payMethodIcon = metodoPago === 'SINPE' ? <SinpeIcon selected /> : payMethodIconFallback
  const payEfectivoLabel = `Confirmar pedido · ${formatPrice(totalFinal)} en efectivo`
  const payLabelFallback = metodoPago === 'EFECTIVO' ? payEfectivoLabel : `Pagá ${formatPrice(totalFinal)}`
  const payLabel = metodoPago === 'SINPE' ? `Pagá con SINPE · ${formatPrice(totalFinal)}` : payLabelFallback

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className="sticky top-24 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.orderSummary')}</h2>

      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
            <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
            <span className="shrink-0">{formatPrice((item.precio ?? item.precioVenta ?? 0) * item.cantidad)}</span>
          </div>
        ))}
      </div>

      {/* Gift card — solo para usuarios autenticados */}
      {token && (
        <div className="pt-2">
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>¿Tenés una gift card?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={gcInput}
              onChange={(e) => { setGcInput(e.target.value.toUpperCase()); setGcEstado('idle'); setGcSaldo(0); setGcCodigo(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validarGiftCard() } }}
              placeholder="GC-XXXX-XXXX-XXXX"
              maxLength={30}
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
              style={{
                background: 'var(--hc-bg)',
                border: `1.5px solid ${gcBorderColor}`,
                color: 'var(--hc-text)',
                letterSpacing: '0.04em',
              }}
            />
            <button
              type="button"
              onClick={validarGiftCard}
              disabled={gcEstado === 'loading' || !gcInput.trim()}
              className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              {gcEstado === 'loading' ? '...' : 'Aplicar'}
            </button>
          </div>
          <AnimatePresence mode="wait">
            {gcEstado === 'valid' && (
              <motion.p key="gc-ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Gift card válida · saldo {formatPrice(gcSaldo)}
              </motion.p>
            )}
            {gcEstado === 'invalid' && (
              <motion.p key="gc-err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-red-400 mt-1">
                Código inválido, vencido o sin saldo
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Campo de cupón */}
      <div className="pt-2">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>¿Tenés un cupón?</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={cuponInput}
            onChange={(e) => { setCuponInput(e.target.value.toUpperCase()); setCuponEstado('idle'); setCuponDescuento(0); setCuponCodigo(null); setCuponError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); validarCupon() } }}
            placeholder="Ej: ABCDEFGHIJ"
            maxLength={20}
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
            style={{
              background: 'var(--hc-bg)',
              border: `1.5px solid ${cuponBorderColor}`,
              color: 'var(--hc-text)',
              letterSpacing: '0.05em',
            }}
          />
          <button
            type="button"
            onClick={validarCupon}
            disabled={cuponEstado === 'loading' || !cuponInput.trim()}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}
          >
            {cuponEstado === 'loading' ? '...' : 'Aplicar'}
          </button>
        </div>
        <AnimatePresence mode="wait">
          {cuponEstado === 'valid' && (
            <motion.p key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              {cuponDescuento}% de descuento aplicado
            </motion.p>
          )}
          {cuponEstado === 'invalid' && (
            <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs text-red-400 mt-1">
              {cuponError || 'Código inválido o no disponible'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-3 border-t space-y-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
        <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
          <span>{t('checkout.subtotal')}</span>
          <span>{formatPrice(subtotalCart)}</span>
        </div>
        {descuentoMonto > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Descuento ({cuponDescuento}%)</span>
            <span>-{formatPrice(descuentoMonto)}</span>
          </div>
        )}
        {gcAplicado > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>Gift card ({gcCodigo})</span>
            <span>-{formatPrice(gcAplicado)}</span>
          </div>
        )}
        <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
          <span>{t('checkout.shippingCost')}</span>
          <span className={costoEnvio === 0 ? 'text-emerald-400 font-medium' : ''}>
            {costoEnvio === 0 ? t('checkout.free') : formatPrice(costoEnvio)}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t flex justify-between font-bold" style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
        <span>{t('checkout.total')}</span>
        <span className="text-lg" style={{ color: 'var(--hc-accent)' }}>{formatPrice(totalFinal)}</span>
      </div>

      {metodoPago === 'SINPE' && (
        <div className="text-[10px] leading-relaxed rounded-lg p-2.5 space-y-0.5" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)', color: 'var(--hc-muted)' }}>
          <p>SINPE: <strong className="text-emerald-400">{SINPE_NUMERO}</strong></p>
          <p>Monto: <strong style={{ color: 'var(--hc-text)' }}>{formatPrice(totalFinal)}</strong></p>
        </div>
      )}

      {/* Trust mini badges */}
      <div className="flex items-center justify-center gap-4 py-2.5 px-3 rounded-xl text-[11px]"
        style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
        <span>{t('checkout.trustWarranty')}</span>
        <span>{t('checkout.trustSecure')}</span>
        <span>{t('checkout.trustReturns')}</span>
      </div>

      {/* Consentimiento de datos — Ley 8968 */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaDatos ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: aceptaDatos ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'transparent', transition: 'all 0.15s' }}>
        <input
          type="checkbox"
          checked={aceptaDatos}
          onChange={e => setAceptaDatos(e.target.checked)}
          style={{ marginTop: 2, accentColor: 'var(--hc-accent)', width: 15, height: 15, flexShrink: 0 }}
        />
        <span style={{ fontSize: 11.5, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
          Autorizo el tratamiento de mis datos y su transferencia al vendedor con el único fin de coordinar la entrega del pedido, conforme a la{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Privacidad</Link>
          {' '}y la{' '}
          <Link to="/cookies" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Cookies</Link>.
        </span>
      </label>

      {/* CTA único rojo del checkout — el botón repite el monto (§5.6 / voseo 15.3) */}
      <button type="button"
        onClick={onPagar}
        disabled={!aceptaDatos || estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
        className="hc-btn hc-btn-primary w-full !h-12 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {payMethodIcon}
        {payLabel}
      </button>

      <p className="text-[10px] text-center leading-relaxed flex items-center justify-center gap-1" style={{ color: 'var(--hc-muted)' }}>
        <LockIcon /> Pago cifrado · Protección al comprador incluida
      </p>
      <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('checkout.terms')} <Link to="/informacion" className="hover:underline">{t('checkout.termsLink')}</Link>.
      </p>
    </motion.div>
  )
}
