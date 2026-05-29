import { useState, useEffect, useRef } from 'react'
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
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import { authService } from '@/services/authService'
import { testimonioService } from '@/services/testimonioService'
import { formatDate, formatPrice } from '@/utils/format'

// ── Utilidades locales ────────────────────────────────────────────────────────

function garantiaDias(fechaPedido) {
  if (!fechaPedido) return null
  const limite = new Date(fechaPedido)
  limite.setDate(limite.getDate() + 40)
  return Math.ceil((limite - new Date()) / 86400000)
}

function primerProducto(order) {
  const items = order.items ?? []
  if (items.length === 0) return 'Sin productos'
  const nombre = items[0].nombreProducto ?? items[0].producto?.nombreProducto ?? 'Producto'
  return items.length > 1 ? `${nombre} +${items.length - 1}` : nombre
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const { userId, userName, userEmail, userRole, logout, refreshToken, isAdmin } = useAuthStore()
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [twoFAEnabled, setTwoFAEnabled]   = useState(false)
  const [show2FASetup, setShow2FASetup]   = useState(false)
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

  const roleLabel = { ADMIN_IT: 'Admin IT', ADMIN_CLIENTE: 'Admin Cliente', EMPRENDEDOR: 'Emprendedor', USUARIO_FINAL: 'Cliente' }
  const { empresaNombre, empresaSlug } = useAuthStore()
  const recentOrders = orders.slice(0, 3)

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-5">

        {/* Título de página */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            {t('profile.datosTitle')}
          </h1>
        </motion.div>

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
              <p className="text-xl font-bold text-[#e8e8ed] truncate">{userName || 'Usuario'}</p>
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

        {/* Tarjeta empresa — solo para emprendedores */}
        {(userRole === 'EMPRENDEDOR' || userRole === 'ADMIN_CLIENTE') && empresaNombre && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-5 flex items-center justify-between gap-4"
            style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--hc-accent)', opacity: 0.15 }}>
                <svg className="w-5 h-5" fill="none" stroke="var(--hc-accent)" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{empresaNombre}</p>
                {empresaSlug && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>/{empresaSlug}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                to="/admin/mi-empresa"
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
              >
                Configurar empresa
              </Link>
              <Link
                to="/admin"
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >
                Panel admin
              </Link>
            </div>
          </motion.div>
        )}

        {/* Pedidos recientes */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
              📋 {t('profile.recentOrders')}
            </h2>
            <button
              onClick={() => navigate('/mis-pedidos')}
              className="text-xs font-semibold transition-colors"
              style={{ color: 'var(--hc-accent)' }}
            >
              {t('profile.verTodos')} →
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : recentOrders.length === 0 ? (
            <div className="px-5 py-5 text-center">
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('profile.ordersNone')}</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
              {recentOrders.map((order) => {
                const dias = garantiaDias(order.fechaPedido)
                return (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                        {primerProducto(order)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                        {formatDate(order.fechaPedido)}
                      </p>
                    </div>
                    {dias !== null && dias > 0 ? (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0"
                        style={{ backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                        🛡 {t('profile.warrantyDays', { count: dias })}
                      </span>
                    ) : dias !== null ? (
                      <span className="text-[11px] px-2 py-1 rounded-lg shrink-0"
                        style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                        {t('profile.warrantyExpired')}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Seguridad */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.security')}</h2>
          </div>

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

          {isAdmin() && (
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
          )}
        </div>

        {/* Testimonios */}
        <TestimonioSection orders={orders} ordersLoading={loading} />

      </div>

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        refreshToken={refreshToken}
      />
      {isAdmin() && (
      <TwoFAModal
        open={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        enabled={twoFAEnabled}
        onToggle={(val) => setTwoFAEnabled(val)}
      />
      )}
    </MainLayout>
  )
}

// ── Sección: Dejar testimonio ─────────────────────────────────────────────────

function TestimonioSection({ orders = [], ordersLoading = false }) {
  const { t } = useTranslation()
  const toast = useToast()
  const fileRef = useRef(null)
  const [comentario, setComentario]       = useState('')
  const [productoId, setProductoId]       = useState('')
  const [imagenUrl, setImagenUrl]         = useState(null)
  const [preview, setPreview]             = useState(null)
  const [uploading, setUploading]         = useState(false)
  const [sending, setSending]             = useState(false)
  const [done, setDone]                   = useState(false)
  const [misTestimonios, setMisTestimonios] = useState([])

  const ESTADOS_VALIDOS = new Set(['PAGADO','EN_PREPARACION','ENVIADO','ENTREGADO','LISTO_RETIRO'])

  const productosComprados = orders
    .filter(o => ESTADOS_VALIDOS.has(o.estadoPedido))
    .flatMap(o => o.items ?? [])
    .reduce((acc, item) => {
      const id = item.productoId ?? item.producto?.id
      const nombre = item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'
      if (id && !acc.find(p => p.id === id)) acc.push({ id, nombre })
      return acc
    }, [])

  const resenadosIds = new Set(misTestimonios.map(m => m.productoId))

  useEffect(() => {
    testimonioService.getMisTestimonios()
      .then(({ data }) => setMisTestimonios(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [done])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await testimonioService.subirImagen(fd)
      const url = data?.url ?? null
      if (!url) throw new Error('No se recibió URL de la imagen')
      setImagenUrl(url)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message
      toast({ message: typeof msg === 'string' ? msg : t('profile.testimonios.uploadError'), type: 'error' })
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comentario.trim() || !productoId) return
    setSending(true)
    try {
      await testimonioService.crear({ comentario, imagenUrl, productoId: Number(productoId) })
      setDone(true)
      setComentario('')
      setProductoId('')
      setImagenUrl(null)
      setPreview(null)
      toast({ message: t('profile.testimonios.success'), type: 'success' })
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : t('profile.testimonios.error'), type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          ⭐ {t('profile.testimonios.title')}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          {t('profile.testimonios.subtitle')}
        </p>
      </div>

      {ordersLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : productosComprados.length === 0 ? (
        <div className="px-5 py-5 text-center">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('profile.testimonios.noProducts')}</p>
        </div>
      ) : done ? (
        <div className="px-5 py-6 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="text-sm font-medium" style={{ color: '#059669' }}>{t('profile.testimonios.success')}</p>
          <button className="text-xs" style={{ color: 'var(--hc-muted)' }} onClick={() => setDone(false)}>
            {t('profile.testimonios.another')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Selector de producto */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              {t('profile.testimonios.productLabel')}
            </label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-sm transition-colors"
              style={{
                backgroundColor: 'var(--hc-surface-2)',
                border: '1px solid var(--hc-border)',
                color: productoId ? 'var(--hc-text)' : 'var(--hc-muted)',
                outline: 'none',
              }}
            >
              <option value="" disabled>{t('profile.testimonios.productPlaceholder')}</option>
              {productosComprados.map(p => (
                <option key={p.id} value={p.id} disabled={resenadosIds.has(p.id)}>
                  {p.nombre}{resenadosIds.has(p.id) ? ' ✓ (ya reseñado)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              {t('profile.testimonios.label')}
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('profile.testimonios.placeholder')}
              required
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none transition-colors"
              style={{
                backgroundColor: 'var(--hc-surface-2)',
                border: '1px solid var(--hc-border)',
                color: 'var(--hc-text)',
                outline: 'none',
              }}
            />
            <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--hc-muted)' }}>
              {comentario.length}/500
            </p>
          </div>

          {/* Foto opcional */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              {t('profile.testimonios.imageLabel')}
            </label>
            {preview ? (
              <div className="relative w-20 h-20">
                <img src={preview} alt="preview" className="w-20 h-20 rounded-xl object-cover" />
                {uploading && (
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50">
                    <Spinner size="sm" />
                  </div>
                )}
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => { setPreview(null); setImagenUrl(null) }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: '#dc2626', color: '#fff' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
                style={{ border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}
              >
                📷 {t('profile.testimonios.addPhoto')}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <Button type="submit" loading={sending} disabled={uploading || !comentario.trim() || !productoId} className="w-full">
            {t('profile.testimonios.submit')}
          </Button>
        </form>
      )}
    </div>
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
    setLoading(true); setError('')
    try {
      const { data } = await authService.setup2FA()
      setQrUri(data?.qrUri ?? '')
      setStep('qr')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFASetupError'))
    } finally { setLoading(false) }
  }

  const handleActivate = async (e) => {
    e.preventDefault()
    if (code.length !== 6) { setError(t('profile.twoFACodeInvalid')); return }
    setLoading(true); setError('')
    try {
      await authService.activate2FA(code)
      toast({ message: t('profile.twoFAActivated'), type: 'success' })
      onToggle(true); onClose()
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFACodeError'))
    } finally { setLoading(false) }
  }

  const handleDisable = async (e) => {
    e.preventDefault()
    if (!contrasena || code.length !== 6) { setError(t('profile.twoFADisableRequired')); return }
    setLoading(true); setError('')
    try {
      await authService.disable2FA(contrasena, code)
      toast({ message: t('profile.twoFADeactivated'), type: 'info' })
      onToggle(false); onClose()
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFADisableError'))
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('profile.twoFactor')}>
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-[#8e8e9a]">{t('profile.twoFASetupInfo')}</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button className="w-full" loading={loading} onClick={handleSetup}>{t('profile.twoFASetupBtn')}</Button>
          </motion.div>
        )}
        {step === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleActivate} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">{t('profile.twoFAQrInfo')}</p>
              {qrUri && (
                <div className="flex justify-center py-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
                    alt="QR 2FA" className="rounded-xl border border-white/10" width={180} height={180}
                  />
                </div>
              )}
              <Input label={t('profile.twoFACodeLabel')} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} inputMode="numeric" placeholder="000000" required />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">{t('profile.twoFAActivateBtn')}</Button>
            </form>
          </motion.div>
        )}
        {step === 'disable' && (
          <motion.div key="disable" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">{t('profile.twoFADisableInfo')}</p>
              <Input label={t('profile.passwordLabel')} type="password" value={contrasena}
                onChange={(e) => setCont(e.target.value)} required autoFocus />
              <Input label={t('profile.twoFAAuthCode')} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} inputMode="numeric" placeholder="000000" required />
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
