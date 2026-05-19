import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import { authService } from '@/services/authService'
import { formatDate, formatPrice, statusColor } from '@/utils/format'

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const { userId, userName, userEmail, userRole, logout, refreshToken } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    if (!userId) return
    orderService.getByUser(userId)
      .then(({ data }) => setOrders(Array.isArray(data) ? data : data.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    authService.get2FAStatus()
      .then(({ data }) => setTwoFAEnabled(data?.enabled ?? false))
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    if (refreshToken) authService.logout(refreshToken).catch(() => {})
    logout()
    toast({ message: t('profile.loggedOut'), type: 'info' })
    navigate('/')
  }

  const roleLabel = { ADMIN_IT: 'Admin IT', ADMIN_CLIENTE: 'Admin Cliente', USUARIO_FINAL: 'Cliente' }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* Header de perfil */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-[#4f7cff]/20 flex items-center justify-center text-2xl font-bold text-[#4f7cff] shrink-0">
              {userName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#e8e8ed] truncate">{userName || 'Usuario'}</h1>
              <p className="text-sm text-[#8e8e9a] truncate">{userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="accent">{roleLabel[userRole] ?? userRole}</Badge>
                {twoFAEnabled && <Badge variant="success">{t('profile.twoFAActive')}</Badge>}
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogout} className="self-start sm:self-center shrink-0">
            {t('profile.logout')}
          </Button>
        </motion.div>

        {/* Mis pedidos */}
        <div
          className="flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all hover:bg-white/3"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
          onClick={() => navigate('/mis-pedidos')}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.orders')}</p>
              {loading ? (
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('profile.ordersLoading')}</p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {orders.length > 0 ? t('profile.orderCount', { count: orders.length }) : t('profile.ordersNone')}
                </p>
              )}
            </div>
          </div>
          <ChevronIcon />
        </div>

        {/* Seguridad */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.security')}</h2>
          </div>

          {/* Cambiar contraseña */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
                <LockIcon />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{t('profile.passwordLabel')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('profile.passwordSub')}</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowChangePassword(true)}>
              {t('profile.passwordChangeBtn')}
            </Button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
                <ShieldIcon />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{t('profile.twoFactor')}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                  {twoFAEnabled ? t('profile.twoFactorOn') : t('profile.twoFactorOff')}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={twoFAEnabled ? 'danger' : 'primary'}
              onClick={() => setShow2FASetup(true)}
            >
              {twoFAEnabled ? t('profile.twoFactorDeactivate') : t('profile.twoFactorActivate')}
            </Button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        refreshToken={refreshToken}
      />

      <TwoFAModal
        open={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        enabled={twoFAEnabled}
        onToggle={(val) => setTwoFAEnabled(val)}
      />
    </MainLayout>
  )
}

// ── Modal: Cambiar contraseña ─────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose, refreshToken }) {
  const [actual, setActual]   = useState('')
  const [nueva, setNueva]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const toast = useToast()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const reset = () => { setActual(''); setNueva(''); setConfirm(''); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (nueva !== confirm) { setError(t('profile.passwordMismatch')); return }
    if (nueva.length < 6)  { setError(t('profile.passwordTooShort')); return }
    setError('')
    setLoading(true)
    try {
      await authService.changePassword(actual, nueva, refreshToken)
      toast({ message: t('profile.passwordUpdated'), type: 'success' })
      logout()
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title={t('profile.changePassword')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('profile.currentPassword')}
          type="password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          required
          autoFocus
        />
        <Input
          label={t('profile.newPassword')}
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          required
          minLength={6}
        />
        <Input
          label={t('profile.confirmPassword')}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-xs text-[#8e8e9a]">
          {t('profile.passwordWarning')}
        </p>
        <Button type="submit" loading={loading} className="w-full">
          {t('profile.updatePassword')}
        </Button>
      </form>
    </Modal>
  )
}

// ── Modal: 2FA ────────────────────────────────────────────────────────────────

function TwoFAModal({ open, onClose, enabled, onToggle }) {
  const [step, setStep]       = useState('info')
  const [qrUri, setQrUri]     = useState('')
  const [code, setCode]       = useState('')
  const [contrasena, setCont] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const toast = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (open) setStep(enabled ? 'disable' : 'info')
    setCode(''); setCont(''); setError(''); setQrUri('')
  }, [open, enabled])

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await authService.setup2FA()
      setQrUri(data?.qrUri ?? '')
      setStep('qr')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFASetupError'))
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (e) => {
    e.preventDefault()
    if (code.length !== 6) { setError(t('profile.twoFACodeInvalid')); return }
    setLoading(true)
    setError('')
    try {
      await authService.activate2FA(code)
      toast({ message: t('profile.twoFAActivated'), type: 'success' })
      onToggle(true)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFACodeError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async (e) => {
    e.preventDefault()
    if (!contrasena || code.length !== 6) { setError(t('profile.twoFADisableRequired')); return }
    setLoading(true)
    setError('')
    try {
      await authService.disable2FA(contrasena, code)
      toast({ message: t('profile.twoFADeactivated'), type: 'info' })
      onToggle(false)
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFADisableError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('profile.twoFactor')}>
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-[#8e8e9a]">
              {t('profile.twoFASetupInfo')}
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button className="w-full" loading={loading} onClick={handleSetup}>
              {t('profile.twoFASetupBtn')}
            </Button>
          </motion.div>
        )}

        {step === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleActivate} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">
                {t('profile.twoFAQrInfo')}
              </p>
              {qrUri && (
                <div className="flex justify-center py-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
                    alt="QR 2FA"
                    className="rounded-xl border border-white/10"
                    width={180}
                    height={180}
                  />
                </div>
              )}
              <Input
                label={t('profile.twoFACodeLabel')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                required
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                {t('profile.twoFAActivateBtn')}
              </Button>
            </form>
          </motion.div>
        )}

        {step === 'disable' && (
          <motion.div key="disable" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">
                {t('profile.twoFADisableInfo')}
              </p>
              <Input
                label={t('profile.passwordLabel')}
                type="password"
                value={contrasena}
                onChange={(e) => setCont(e.target.value)}
                required
                autoFocus
              />
              <Input
                label={t('profile.twoFAAuthCode')}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                required
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" loading={loading} variant="danger" className="w-full">
                {t('profile.twoFADeactivateBtn')}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

// ── Iconos ────────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
