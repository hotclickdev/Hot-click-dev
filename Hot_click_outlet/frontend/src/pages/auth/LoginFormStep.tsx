import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Input from '@/components/ui/Input'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import { Turnstile } from '@marsidev/react-turnstile'
import { A } from './authUi'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Dispatch, FormEvent, SetStateAction, RefObject } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

type LoginFormStepProps = {
  correo: string
  setCorreo: Dispatch<SetStateAction<string>>
  contrasena: string
  setContrasena: Dispatch<SetStateAction<string>>
  error: string
  needsVerification: boolean
  needsPasswordReset: boolean
  resendLoading: boolean
  loading: boolean
  turnstileToken: string
  turnstileRef: RefObject<TurnstileInstance | null>
  turnstileSiteKey: string | undefined
  clerkEnabled: boolean
  setTurnstileToken: Dispatch<SetStateAction<string>>
  onSubmit: (e: FormEvent) => void
  onResendVerification: () => void
  onForgot: () => void
}

export default function LoginFormStep({
  correo, setCorreo, contrasena, setContrasena,
  error, needsVerification, needsPasswordReset,
  resendLoading, loading, turnstileToken,
  turnstileRef, turnstileSiteKey, clerkEnabled,
  setTurnstileToken, onSubmit, onResendVerification, onForgot,
}: LoginFormStepProps) {
  const { t } = useTranslation()
  const stats = [
    { icono: 'candado' as string | null, val: '100%', label: t('login.statSecure') },
    { icono: null as string | null, val: 'CR', label: t('login.statCr') },
    { icono: 'estrella' as string | null, val: '4.9', label: t('login.statRating') },
    { icono: null as string | null, val: '10K+', label: t('login.statProducts') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>

      <div className="mb-7">
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 7vw, 3.4rem)', color: 'var(--hc-text)' }}>
          {t('login.titleLine1')}
        </h1>
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2.4rem, 7vw, 3.4rem)',
            background: `linear-gradient(120deg, ${A.color} 0%, color-mix(in srgb, ${A.color} 65%, var(--hc-blue-300)) 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {t('login.titleLine2')}
        </h1>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-5 h-[2px] rounded-full" style={{ background: A.color }} />
          <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>
            {t('login.subtitle')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
        <div className="p-6 sm:p-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input label={t('login.email')} type="email" value={correo}
              onChange={e => setCorreo(e.target.value)} placeholder={t('login.emailPlaceholder')}
              required autoFocus maxLength={150} />
            <Input label={t('login.password')} type="password" value={contrasena}
              onChange={e => setContrasena(e.target.value)} placeholder="••••••••"
              required maxLength={128} />

            <div className="flex justify-end -mt-1">
              <button type="button" onClick={onForgot}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: A.color, background: 'none', border: 'none', cursor: 'pointer' }}>
                {t('login.forgotPassword')}
              </button>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                {error}
                {needsVerification && (
                  <button type="button" onClick={onResendVerification} disabled={resendLoading}
                    style={{ textAlign: 'left', color: A.color, fontSize: 12, background: 'none', border: 'none', cursor: resendLoading ? 'not-allowed' : 'pointer', opacity: resendLoading ? 0.6 : 1 }}>
                    {resendLoading ? t('login.sending') : <TextoFlecha>{t('login.resendVerification')}</TextoFlecha>}
                  </button>
                )}
                {needsPasswordReset && (
                  <button type="button" onClick={onForgot}
                    style={{ textAlign: 'left', color: A.color, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <TextoFlecha>{t('login.recoverByEmail')}</TextoFlecha>
                  </button>
                )}
              </motion.div>
            )}

            {turnstileSiteKey && (
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken('')}
                onExpire={() => setTurnstileToken('')}
                options={{ appearance: 'invisible' as 'always' }}
              />
            )}

            <button type="submit" disabled={loading || (!!turnstileSiteKey && !turnstileToken)}
              className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('common.loading')}
                </>
              ) : (
                <TextoFlecha iconClassName="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1">
                  {t('login.submit')}
                </TextoFlecha>
              )}
            </button>
          </form>

          {clerkEnabled && <SocialLoginButtons mode="signIn" />}

          <p className="text-center text-sm mt-4" style={{ color: 'var(--hc-muted)' }}>
            {t('login.noAccount')}{' '}
            <Link to="/registro" className="font-semibold" style={{ color: A.color }}>
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-6 flex items-stretch rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
        {stats.map(({ icono, val, label }, i) => (
          <div key={label} className="flex-1 flex flex-col items-center justify-center py-3 px-2 relative">
            {i > 0 && <div className="absolute left-0 top-2 bottom-2 w-px" style={{ background: 'var(--hc-border)' }} />}
            <div className="text-sm font-black" style={{ color: 'var(--hc-text)', lineHeight: 1 }}>
              {icono ? (
                <span style={{ color: 'var(--hc-text)' }}>
                  <TrustGlyph tipo={icono} className="w-4 h-4" />
                </span>
              ) : val}
            </div>
            {icono && <div className="text-xs font-bold mt-0.5" style={{ color: A.color }}>{val}</div>}
            <div className="text-[10px] mt-1 text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>{label}</div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
