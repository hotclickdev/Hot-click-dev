import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { authService } from '@/services/authService'
import { mensajeErrorApi } from './perfilHelpers'

export default function ChangePasswordModal({
  open, onClose, refreshToken,
}: {
  open: boolean
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
    <Modal open={open} onClose={() => { onClose(); reset() }} title={t('profile.changePassword')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('profile.currentPassword')} type="password" value={actual}
          onChange={(e) => setActual(e.target.value)} required autoFocus />
        <Input label={t('profile.newPassword')} type="password" value={nueva}
          onChange={(e) => setNueva(e.target.value)} required minLength={6} />
        <Input label={t('profile.confirmPassword')} type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} required />
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <p className="text-xs text-[#8e8e9a]">{t('profile.passwordWarning')}</p>
        <Button type="submit" loading={loading} className="w-full">{t('profile.updatePassword')}</Button>
      </form>
    </Modal>
  )
}
