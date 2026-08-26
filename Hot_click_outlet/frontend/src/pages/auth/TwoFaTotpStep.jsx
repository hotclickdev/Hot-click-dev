import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { A } from './authUi'
import TwoFaCodeInputs from './TwoFaCodeInputs'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function TwoFaTotpStep({
  useRecovery, recoveryInput, onRecoveryInput,
  code2FA, refs2FA, onCodeChange,
  error, loading, onSubmit, onToggleRecovery, onBack,
}) {
  const { t } = useTranslation()
  const verifyLabel = useRecovery ? 'Usar código de recuperación' : t('login.verify')

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>

      <h1 className="font-black leading-[1.02] tracking-tight mb-3"
        style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
        {t('login.title2fa')}
      </h1>
      <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>{t('login.subtitle2fa')}</p>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
        <div className="p-6 sm:p-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {useRecovery ? (
              <div>
                <label htmlFor="login-recovery-code" className="hc-input-label block mb-2">{t('login.recoveryCodeLabel')}</label>
                <input id="login-recovery-code" type="text" value={recoveryInput}
                  onChange={e => onRecoveryInput(e.target.value.toUpperCase())}
                  placeholder="XXXXX-XXXXX" autoFocus
                  className="hc-input w-full text-center"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }} />
                <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--hc-muted)' }}>{t('login.emergencyCodeHint')}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-center mb-4"
                  style={{ color: 'var(--hc-muted)' }}>Código de 6 dígitos</p>
                <TwoFaCodeInputs code2FA={code2FA} refs2FA={refs2FA} onChange={onCodeChange} />
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 rounded-xl text-sm text-center"
                style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
              {loading ? 'Verificando…' : verifyLabel}
            </button>
            <button type="button" className="hc-btn hc-btn-outline hc-btn-lg w-full" onClick={onToggleRecovery}>
              {useRecovery ? <TextoFlecha dir="atras">Volver a código TOTP</TextoFlecha> : '¿Perdiste tu dispositivo?'}
            </button>
            <button type="button" className="hc-btn hc-btn-outline w-full" onClick={onBack}>
              <TextoFlecha dir="atras">{t('login.backToLogin')}</TextoFlecha>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
