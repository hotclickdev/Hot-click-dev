import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BotonModalCuenta, CampoModalCuenta, ContenedorModalCuenta, ErrorModalCuenta } from './PiezasModalCuenta'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { authService } from '@/services/authService'
import { mensajeErrorApi } from './perfilHelpers'

export default function ChangePasswordModal({
  open, onClose, refreshToken, figma = false,
}: {
  open: boolean
  /** Solo comprador: hoja inferior y campos de Figma. ⚠️ COMPARTIDO, sin `figma` queda igual. */
  figma?: boolean
  onClose: () => void
  refreshToken: string | null
}) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const reset = () => { setActual(''); setNueva(''); setConfirm(''); setError('') }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (nueva !== confirm) { setError(t('profile.passwordMismatch')); return }
    if (nueva.length < 6)  { setError(t('profile.passwordTooShort')); return }
    setError('')
    setLoading(true)
    try {
      await authService.changePassword(actual, nueva, refreshToken as string)
      toast({ message: t('profile.passwordUpdated'), type: 'success' })
      logout()
      navigate('/login')
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      setError(typeof msg === 'string' && msg ? msg : t('profile.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ContenedorModalCuenta figma={figma} open={open} onClose={() => { onClose(); reset() }} titulo={t('profile.changePassword')}>
      <form onSubmit={handleSubmit} className={figma ? 'flex flex-col gap-[14px]' : 'space-y-4'}>
        <CampoModalCuenta figma={figma} etiqueta={t('profile.currentPassword')} type="password" value={actual}
          onChange={(e) => setActual(e.target.value)} required autoFocus autoComplete="current-password" />
        <CampoModalCuenta figma={figma} etiqueta={t('profile.newPassword')} type="password" value={nueva}
          onChange={(e) => setNueva(e.target.value)} required minLength={6} autoComplete="new-password" />
        <CampoModalCuenta figma={figma} etiqueta={t('profile.confirmPassword')} type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        <ErrorModalCuenta figma={figma} texto={error} />
        {figma
          ? <p className="text-[12px] leading-4 text-hc-n-600">{t('profile.passwordWarning')}</p>
          : <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('profile.passwordWarning')}</p>}
        <BotonModalCuenta figma={figma} type="submit" loading={loading}>{t('profile.updatePassword')}</BotonModalCuenta>
      </form>
    </ContenedorModalCuenta>
  )
}
