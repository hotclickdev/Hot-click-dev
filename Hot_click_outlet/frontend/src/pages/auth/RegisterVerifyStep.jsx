import { motion } from 'framer-motion'
import CartModal from './CartModal'

const BUYER = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}

/**
 * Paso de verificación de cuenta (código de 6 dígitos).
 */
export default function RegisterVerifyStep({
  t, codigo, setCodigo, correoRegistro, error, loading,
  onVerify, onReenviar, onBack,
  showCartRecovery, recoveryCart, addItem, onCloseCart, onDoneCart,
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{ background: 'var(--hc-bg)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 55% at 50% 30%, ${BUYER.glow}, transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
          style={{ fontSize: '20vw', color: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}>CÓDIGO</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px]">

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 w-fit"
          style={{ background: BUYER.bg, border: `1px solid ${BUYER.ring}`, color: BUYER.color }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BUYER.color }}></span>
          <span>Verificación de cuenta</span>
        </div>

        <h1 className="font-black leading-[1.02] tracking-tight mb-2"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: 'var(--hc-text)' }}>
          {t('register.verifyTitle')}
        </h1>
        <p className="text-base mb-6" style={{ color: 'var(--hc-muted)' }}>
          {t('register.verifyCodeSent')}{' '}
          <span className="font-semibold" style={{ color: 'var(--hc-text)' }}>{correoRegistro}</span>
        </p>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
          <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${BUYER.color}, transparent)` }} />
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-5"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-warning)' }}>
                <span className="font-semibold">Este código es solo para verificar tu cuenta.</span>{' '}No lo compartas con nadie.
              </p>
            </div>

            <form onSubmit={onVerify} className="flex flex-col gap-4">
              <div>
                <label htmlFor="reg-codigo-email" className="hc-input-label block mb-2">{t('register.verificationCode')}</label>
                <input id="reg-codigo-email" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" autoFocus className="hc-input w-full text-center"
                  style={{ fontSize: 32, fontWeight: 900, letterSpacing: '0.55em', height: 64, padding: '0 12px' }} />
                <p className="text-xs text-center mt-2" style={{ color: 'var(--hc-muted)' }}>
                  Ingresá los 6 dígitos que llegaron a tu correo
                </p>
              </div>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
                  style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 20%, transparent)' }}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {error}
                </motion.div>
              )}
              <button type="submit" disabled={loading}
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
                style={{ background: BUYER.color, boxShadow: `0 0 32px ${BUYER.ring}` }}>
                {loading ? 'Verificando…' : t('register.verifyBtn')}
              </button>
            </form>

            <div className="mt-5 text-center flex flex-col gap-2">
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {t('register.noEmail')}{' '}
                <button type="button" onClick={onReenviar} disabled={loading}
                  className="font-semibold disabled:opacity-50"
                  style={{ color: BUYER.color, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t('register.resend')}
                </button>
              </p>
              <button type="button" onClick={onBack}
                className="text-xs" style={{ color: 'var(--hc-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← {t('register.backToForm')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <CartModal open={showCartRecovery} cart={recoveryCart} addItem={addItem}
        onClose={onCloseCart} onDone={onDoneCart} />
    </div>
  )
}
