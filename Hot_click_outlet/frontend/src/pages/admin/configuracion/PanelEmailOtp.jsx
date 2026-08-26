import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { authService } from '@/services/authService'
import { F, Block, FormGroup, StyledInput, ShieldIcon, CheckIcon, MailIcon } from './configUi'

export default function PanelEmailOtp({ enabled, loading, toast, onEnabled, onDisabled }) {
  const [step,      setStep]      = useState('idle')   // idle | setup | verify | disable
  const [code,      setCode]      = useState('')
  const [password,  setPassword]  = useState('')
  const [working,   setWorking]   = useState(false)
  const [cooldown,  setCooldown]  = useState(0)

  const startCooldown = () => {
    setCooldown(60)
    const id = setInterval(() => setCooldown(s => { if (s <= 1) { clearInterval(id); return 0 } return s - 1 }), 1000)
  }

  const cancel = () => { setStep('idle'); setCode(''); setPassword(''); setWorking(false) }

  const sendOtp = async () => {
    setWorking(true)
    try {
      await authService.enableEmailOtp()
      startCooldown()
      setStep('verify')
      toast({ message: 'Código enviado a tu correo', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al enviar código', type: 'error' })
      setStep('idle')
    } finally { setWorking(false) }
  }

  const activate = async () => {
    if (!code || code.length !== 6) { toast({ message: 'Ingresá los 6 dígitos', type: 'error' }); return }
    setWorking(true)
    try {
      await authService.activateEmailOtp(code)
      toast({ message: 'Email OTP activado correctamente', type: 'success' })
      onEnabled()
      cancel()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Código incorrecto', type: 'error' })
    } finally { setWorking(false) }
  }

  const disable = async () => {
    if (!password) { toast({ message: 'Ingresá tu contraseña', type: 'error' }); return }
    setWorking(true)
    try {
      await authService.disableEmailOtp(password)
      toast({ message: 'Email OTP desactivado', type: 'success' })
      onDisabled()
      cancel()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al desactivar', type: 'error' })
    } finally { setWorking(false) }
  }

  if (loading) return null

  const E = { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)' }

  return (
    <Block label="Código OTP por correo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>Email OTP</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body }}>
              Código de 6 dígitos enviado a tu correo al iniciar sesión.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '6px',
              background: enabled ? 'rgba(34,197,94,0.12)' : 'var(--hc-surface-2)',
              color: enabled ? '#22c55e' : 'var(--hc-muted)',
              border: `1px solid ${enabled ? 'rgba(34,197,94,0.28)' : 'var(--hc-border)'}` }}>
              {enabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* CTA buttons */}
        {step === 'idle' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {!enabled ? (
              <button type="button" onClick={sendOtp} disabled={working} className="cfg-btn cfg-btn-primary" style={{ background: E.color, boxShadow: `0 1px 12px ${E.border}` }}>
                {working ? <Spinner size="xs" /> : <ShieldIcon style={{ width: '14px', height: '14px' }} />}
                Activar Email OTP
              </button>
            ) : (
              <button type="button" onClick={() => setStep('disable')} className="cfg-btn cfg-btn-danger">
                Desactivar Email OTP
              </button>
            )}
          </div>
        )}

        {/* Verify OTP step */}
        {step === 'verify' && (
          <div style={{ borderRadius: '12px', padding: '16px', background: E.bg, border: `1px solid ${E.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p className="inline-flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>
              <MailIcon style={{ width: 14, height: 14 }} />
              Revisá tu correo e ingresá el código de 6 dígitos
            </p>
            <FormGroup label="Código de verificación">
              <input type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="cfg-input"
                style={{ fontFamily: F.mono, letterSpacing: '0.3em', fontSize: '20px', textAlign: 'center' }} />
            </FormGroup>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={activate} disabled={working || code.length !== 6} className="cfg-btn cfg-btn-primary">
                {working ? <Spinner size="xs" /> : <CheckIcon style={{ width: '14px', height: '14px' }} />}
                Activar
              </button>
              <button type="button" onClick={sendOtp} disabled={cooldown > 0 || working} className="cfg-btn cfg-btn-ghost inline-flex items-center gap-1.5">
                {cooldown > 0 ? `Reenviar (${cooldown}s)` : (
                  <>
                    <TrustGlyph tipo="reenviar" className="w-3.5 h-3.5" />
                    Reenviar código
                  </>
                )}
              </button>
              <button type="button" onClick={cancel} className="cfg-btn cfg-btn-ghost">Cancelar</button>
            </div>
          </div>
        )}

        {/* Disable confirmation */}
        {step === 'disable' && (
          <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>
              Confirmá tu contraseña para desactivar Email OTP
            </p>
            <FormGroup label="Contraseña actual">
              <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
            </FormGroup>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={disable} disabled={working || !password}
                className="cfg-btn"
                style={{ background: '#dc2626', color: '#fff', opacity: (working || !password) ? 0.4 : 1, cursor: (working || !password) ? 'not-allowed' : 'pointer' }}>
                {working ? <Spinner size="xs" /> : null} Desactivar
              </button>
              <button type="button" onClick={cancel} className="cfg-btn cfg-btn-ghost">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </Block>
  )
}
