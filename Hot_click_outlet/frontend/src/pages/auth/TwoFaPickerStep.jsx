import { motion } from 'framer-motion'
import { A } from './authUi'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function TwoFaPickerStep({ methods, loading, onPick, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
      <h1 className="font-black leading-[1.02] tracking-tight mb-3"
        style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', color: 'var(--hc-text)' }}>
        Verificación en 2 pasos
      </h1>
      <p className="text-base mb-7" style={{ color: 'var(--hc-muted)' }}>
        ¿Cómo querés verificar tu identidad?
      </p>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${A.color}, transparent)` }} />
        <div className="p-6 flex flex-col gap-3">
          {methods.includes('TOTP') && (
            <button type="button" onClick={() => onPick('TOTP')} disabled={loading}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
              style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <span style={{ color: 'var(--hc-accent)' }}>
                <TrustGlyph tipo="candado" className="w-7 h-7" />
              </span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>App de autenticación</p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Google Authenticator, Authy, etc.</p>
              </div>
            </button>
          )}
          {methods.includes('EMAIL_OTP') && (
            <button type="button" onClick={() => onPick('EMAIL_OTP')} disabled={loading}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
              style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <span style={{ color: 'var(--hc-accent)' }}>
                <TrustGlyph tipo="sobre" className="w-7 h-7" />
              </span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Código por correo</p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Te enviamos un código a tu email</p>
              </div>
            </button>
          )}
          <button type="button" className="hc-btn hc-btn-outline w-full mt-1" onClick={onBack}>
            <TextoFlecha dir="atras">Volver</TextoFlecha>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
