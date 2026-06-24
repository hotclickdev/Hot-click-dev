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
import AdminWebAuthnSetup from '@/components/admin/AdminWebAuthnSetup'
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

        {/* Llave de seguridad WebAuthn — solo ADMIN_IT */}
        {userRole === 'ADMIN_IT' && <AdminWebAuthnSetup />}

        {/* Testimonios y Reseñas */}
        <OpinionesSection orders={orders} ordersLoading={loading} />

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

// ── Constantes compartidas ────────────────────────────────────────────────────

const RATING_LABELS = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }
const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
const MAX_RESENAS = 3

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          aria-label={`${s} estrella${s !== 1 ? 's' : ''}`}>
          <svg className="w-8 h-8 transition-colors duration-100" viewBox="0 0 20 20"
            fill={s <= active ? 'currentColor' : 'none'} stroke="currentColor"
            strokeWidth={s <= active ? 0 : 1.5}
            style={{ color: s <= active ? '#fbbf24' : 'var(--hc-border)' }}>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ── Hook: subir imagen (compartido entre los dos forms) ───────────────────────

function useImageUpload(toast) {
  const [imagenUrl, setImagenUrl] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [uploading, setUploading] = useState(false)

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
      toast({ message: typeof msg === 'string' ? msg : 'Error al subir la imagen.', type: 'error' })
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => { setImagenUrl(null); setPreview(null) }

  return { imagenUrl, preview, uploading, handleFile, reset }
}

// ── Widget: selector de imagen ────────────────────────────────────────────────

function ImagenPicker({ preview, uploading, onRemove, onFile }) {
  const ref = useRef(null)
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
        Foto <span style={{ color: 'var(--hc-muted)', fontWeight: 400 }}>(opcional)</span>
      </label>
      {preview ? (
        <div className="relative w-20 h-20">
          <img src={preview} alt="preview" className="w-20 h-20 rounded-xl object-cover" />
          {uploading
            ? <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50"><Spinner size="sm" /></div>
            : <button type="button" onClick={onRemove}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}>✕</button>
          }
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
          📷 Agregar foto
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}

// ── Sección principal: dos tabs ───────────────────────────────────────────────

function OpinionesSection({ orders = [], ordersLoading = false }) {
  const [tab, setTab] = useState('testimonio') // 'testimonio' | 'resena'

  const tabStyle = (active) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '10px',
    transition: 'all 0.15s',
    backgroundColor: active ? 'var(--hc-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--hc-muted)',
    border: 'none',
    cursor: 'pointer',
  })

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--hc-text)' }}>
          ⭐ Tu opinión
        </h2>
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
          <button style={tabStyle(tab === 'testimonio')} onClick={() => setTab('testimonio')}>
            💬 Testimonio web
          </button>
          <button style={tabStyle(tab === 'resena')} onClick={() => setTab('resena')}>
            📦 Reseña de producto
          </button>
        </div>
      </div>

      {/* Contenido del tab activo */}
      {tab === 'testimonio'
        ? <TestimonioForm />
        : <ResenaForm orders={orders} ordersLoading={ordersLoading} />
      }
    </div>
  )
}

// ── Tab 1: Testimonio general de la web ───────────────────────────────────────

function TestimonioForm() {
  const toast = useToast()
  const img   = useImageUpload(toast)
  const [comentario, setComentario] = useState('')
  const [sending, setSending]       = useState(false)
  const [done, setDone]             = useState(false)

  const reset = () => { setComentario(''); img.reset(); setDone(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!comentario.trim()) return
    setSending(true)
    try {
      await testimonioService.crearTestimonio({ comentario, imagenUrl: img.imagenUrl })
      setDone(true)
      toast({ message: '¡Gracias! Tu testimonio está pendiente de aprobación.', type: 'success' })
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : 'No se pudo enviar. Intentá de nuevo.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  if (done) return (
    <div className="px-5 py-8 text-center space-y-2">
      <p className="text-3xl">🎉</p>
      <p className="text-sm font-semibold" style={{ color: '#059669' }}>¡Testimonio enviado!</p>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Aparecerá en la web una vez que lo aprobemos.</p>
      <button className="text-xs mt-2 underline" style={{ color: 'var(--hc-muted)' }} onClick={reset}>
        Dejar otro testimonio
      </button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Contanos tu experiencia comprando en HotClick. Aparecerá en nuestra web para ayudar a otros clientes.
      </p>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
          Tu comentario <span style={{ color: 'var(--hc-accent)' }}>*</span>
        </label>
        <textarea value={comentario} onChange={e => setComentario(e.target.value)}
          maxLength={500} rows={4}
          placeholder="¿Qué te pareció nuestra tienda? ¿Cómo fue tu experiencia?"
          required
          className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', outline: 'none' }} />
        <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--hc-muted)' }}>{comentario.length}/500</p>
      </div>

      <ImagenPicker preview={img.preview} uploading={img.uploading}
        onRemove={img.reset} onFile={img.handleFile} />

      <Button type="submit" loading={sending} disabled={img.uploading || !comentario.trim()} className="w-full">
        Enviar testimonio
      </Button>
    </form>
  )
}

// ── Tab 2: Reseña de producto ─────────────────────────────────────────────────

const ESTADOS_VALIDOS = new Set(['PAGADO','EN_PREPARACION','ENVIADO','ENTREGADO','LISTO_RETIRO'])

function ResenaForm({ orders = [], ordersLoading = false }) {
  const toast = useToast()
  const img   = useImageUpload(toast)
  const [productoId, setProductoId]   = useState('')
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario]   = useState('')
  const [sending, setSending]         = useState(false)
  const [done, setDone]               = useState(false)
  const [misResenas, setMisResenas]   = useState([])

  // Productos comprados (de orders locales) con cuántas reseñas tiene el usuario (del backend)
  const productosComprados = orders
    .filter(o => ESTADOS_VALIDOS.has(o.estadoPedido))
    .flatMap(o => o.items ?? [])
    .reduce((acc, item) => {
      const id = item.productoId ?? item.producto?.id
      const nombre = item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'
      if (id && !acc.find(p => p.id === id)) acc.push({ id, nombre })
      return acc
    }, [])

  // Conteo de reseñas por productoId desde el backend
  const conteoMap = misResenas.reduce((m, r) => {
    if (r.tipo === 'RESENA' && r.productoId) m[r.productoId] = (m[r.productoId] ?? 0) + 1
    return m
  }, {})

  useEffect(() => {
    testimonioService.getMisTestimonios()
      .then(({ data }) => setMisResenas(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [done])

  const reset = () => {
    setProductoId(''); setCalificacion(0); setComentario(''); img.reset(); setDone(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productoId || !comentario.trim()) return
    if (!calificacion) {
      toast({ message: 'Seleccioná una calificación de 1 a 5 estrellas.', type: 'error' })
      return
    }
    setSending(true)
    try {
      await testimonioService.crearResena({ productoId: Number(productoId), comentario, calificacion, imagenUrl: img.imagenUrl })
      setDone(true)
      toast({ message: '¡Reseña enviada! Aparecerá en el producto una vez aprobada.', type: 'success' })
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ message: typeof msg === 'string' ? msg : 'No se pudo enviar. Intentá de nuevo.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  if (done) return (
    <div className="px-5 py-8 text-center space-y-2">
      <p className="text-3xl">🎉</p>
      <p className="text-sm font-semibold" style={{ color: '#059669' }}>¡Reseña enviada!</p>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Aparecerá en el producto una vez que la aprobemos.</p>
      <button className="text-xs mt-2 underline" style={{ color: 'var(--hc-muted)' }} onClick={reset}>
        Dejar otra reseña
      </button>
    </div>
  )

  if (ordersLoading) return <div className="flex justify-center py-6"><Spinner /></div>

  if (productosComprados.length === 0) return (
    <div className="px-5 py-6 text-center">
      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
        Aún no tenés productos elegibles para reseñar. Solo podés reseñar productos que hayas comprado.
      </p>
    </div>
  )

  const productoSeleccionado = productoId ? productosComprados.find(p => String(p.id) === String(productoId)) : null
  const resenasDelProducto   = productoSeleccionado ? (conteoMap[productoSeleccionado.id] ?? 0) : 0
  const limiteAlcanzado      = resenasDelProducto >= MAX_RESENAS

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Podés dejar hasta <strong>{MAX_RESENAS} reseñas</strong> por producto comprado.
      </p>

      {/* Selector de producto */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
          Producto <span style={{ color: 'var(--hc-accent)' }}>*</span>
        </label>
        <select value={productoId} onChange={e => { setProductoId(e.target.value); setCalificacion(0) }}
          required
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
            color: productoId ? 'var(--hc-text)' : 'var(--hc-muted)', outline: 'none' }}>
          <option value="" disabled>Seleccioná el producto...</option>
          {productosComprados.map(p => {
            const count = conteoMap[p.id] ?? 0
            const lleno = count >= MAX_RESENAS
            return (
              <option key={p.id} value={p.id} disabled={lleno}>
                {p.nombre}{lleno ? ` (${MAX_RESENAS}/${MAX_RESENAS} reseñas)` : count > 0 ? ` (${count}/${MAX_RESENAS})` : ''}
              </option>
            )
          })}
        </select>

        {/* Indicador de reseñas restantes */}
        {productoSeleccionado && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {Array.from({ length: MAX_RESENAS }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i < resenasDelProducto ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            ))}
            <span className="text-[11px] ml-1" style={{ color: limiteAlcanzado ? '#ef4444' : 'var(--hc-muted)' }}>
              {limiteAlcanzado ? 'Límite alcanzado' : `${resenasDelProducto}/${MAX_RESENAS} reseñas`}
            </span>
          </div>
        )}
      </div>

      {limiteAlcanzado ? (
        <p className="text-xs text-center py-2" style={{ color: '#ef4444' }}>
          Ya enviaste {MAX_RESENAS} reseñas para este producto.
        </p>
      ) : (
        <>
          {/* Calificación */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Calificación <span style={{ color: 'var(--hc-accent)' }}>*</span>
            </label>
            <div className="flex items-center gap-3">
              <StarPicker value={calificacion} onChange={setCalificacion} />
              {calificacion > 0 && (
                <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                  {RATING_LABELS[calificacion]}
                </span>
              )}
            </div>
          </div>

          {/* Comentario */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Tu reseña <span style={{ color: 'var(--hc-accent)' }}>*</span>
            </label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              maxLength={500} rows={3}
              placeholder="¿Qué te pareció el producto? Tu experiencia ayuda a otros compradores…"
              required
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', outline: 'none' }} />
            <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--hc-muted)' }}>{comentario.length}/500</p>
          </div>

          <ImagenPicker fileRef={img.fileRef} preview={img.preview} uploading={img.uploading}
            onRemove={() => img.reset()} />

          <Button type="submit" loading={sending}
            disabled={img.uploading || !productoId || !calificacion || !comentario.trim()}
            className="w-full">
            Enviar reseña
          </Button>
        </>
      )}
    </form>
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
