import { motion } from 'framer-motion'
import { A } from './authUi'
import TwoFaCodeInputs from './TwoFaCodeInputs'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { Dispatch, FormEvent, SetStateAction, RefObject } from 'react'

type TwoFaEmailOtpStepProps = {
  code2FA: string[]
  refs2FA: RefObject<(HTMLInputElement | null)[]>
  onCodeChange: Dispatch<SetStateAction<string[]>>
  error: string
  loading: boolean
  resendCooldown: number
  onSubmit: (e: FormEvent) => void
  onResend: () => void
  onBack: () => void
}

export default function TwoFaEmailOtpStep({
  code2FA, refs2FA, onCodeChange, error, loading, resendCooldown,
  onSubmit, onResend, onBack,
}: TwoFaEmailOtpStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
      <h1 className="font-black leading-[1.02] tracking-tight mb-3"
        style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
        Código de verificación
      </h1>
      <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>
        Revisá tu correo e ingresá el código de 6 dígitos.
      </p>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
        <div className="p-6 sm:p-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-center mb-4"
                style={{ color: 'var(--hc-muted)' }}>Código de 6 dígitos</p>
              <TwoFaCodeInputs code2FA={code2FA} refs2FA={refs2FA} onChange={onCodeChange} />
              <p className="text-xs text-center mt-3" style={{ color: 'var(--hc-muted)' }}>
                El código expira en 5 minutos.
              </p>
            </div>
            {error && (
              <div className="px-3 py-2.5 rounded-xl text-sm text-center"
                style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
              {loading ? 'Verificando…' : 'Verificar código'}
            </button>
            <button type="submit" disabled={resendCooldown > 0 || loading}
              className="hc-btn hc-btn-outline hc-btn-lg w-full disabled:opacity-40"
              onClick={onResend}>
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : (
                <span className="inline-flex items-center justify-center gap-1.5">
                  <TrustGlyph tipo="reenviar" className="w-3.5 h-3.5" />
                  Reenviar código
                </span>
              )}
            </button>
            <button type="button" className="hc-btn hc-btn-outline w-full" onClick={onBack}>
              <TextoFlecha dir="atras">Volver</TextoFlecha>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
