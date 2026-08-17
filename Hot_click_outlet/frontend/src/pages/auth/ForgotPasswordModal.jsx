import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorAuth } from './authHelpers'

export default function ForgotPasswordModal({ open, onClose }) {
  const [step,    setStep]    = useState('email')
  const [correo,  setCorreo]  = useState('')
  const [codigo,  setCodigo]  = useState('')
  const [nueva,   setNueva]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const toast = useToast()
  const { t } = useTranslation()

  const handleEmail = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authService.forgotPassword(correo)
      toast({ message: t('forgot.codeSent'), type: 'success' }); setStep('code')
    } catch (err) {
      const msg = mensajeErrorAuth(err, t('forgot.emailNotFound'))
      setError(msg || t('forgot.emailNotFound'))
    } finally { setLoading(false) }
  }

  const handleCode = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await authService.verifyCode(correo, codigo); setStep('password')
    } catch (err) {
      const msg = mensajeErrorAuth(err, t('forgot.badCode'))
      setError(msg || t('forgot.badCode'))
    } finally { setLoading(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (nueva.length < 6) { setError(t('forgot.minChars')); return }
    setError(''); setLoading(true)
    try {
      await authService.resetPassword(correo, nueva)
      toast({ message: t('forgot.passwordChanged'), type: 'success' })
      onClose(); setStep('email'); setCorreo(''); setCodigo(''); setNueva('')
    } catch { setError(t('forgot.errorChange')) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); setStep('email'); setError('') }} title={t('forgot.title')}>
      {step === 'email' && (
        <form onSubmit={handleEmail} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.emailStep')}</p>
          <Input label={t('forgot.emailLabel')} type="email" value={correo} onChange={e => setCorreo(e.target.value)} required />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Enviando…' : t('forgot.sendCode')}
          </button>
        </form>
      )}
      {step === 'code' && (
        <form onSubmit={handleCode} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.codeStep')} <strong style={{ color: 'var(--hc-text)' }}>{correo}</strong></p>
          <Input label={t('forgot.codeLabel')} value={codigo} onChange={e => setCodigo(e.target.value)} required maxLength={6} />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Verificando…' : t('forgot.codeVerify')}
          </button>
        </form>
      )}
      {step === 'password' && (
        <form onSubmit={handlePassword} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('forgot.passwordStep')}</p>
          <Input label={t('forgot.newPassword')} type="password" value={nueva} onChange={e => setNueva(e.target.value)} required minLength={6} />
          {error && <p className="text-sm" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
          <button type="submit" disabled={loading} className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-60">
            {loading ? 'Guardando…' : t('forgot.changePassword')}
          </button>
        </form>
      )}
    </Modal>
  )
}
