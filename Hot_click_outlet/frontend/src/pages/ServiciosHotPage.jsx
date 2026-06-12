import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import PhoneField from '@/components/ui/PhoneField'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import useAuthStore from '@/store/authStore'
import { servicioService } from '@/services/servicioService'
import { garantiaService } from '@/services/garantiaService'
import { testimonioService } from '@/services/testimonioService'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const SITE_URL = 'https://hotclick.lat'

const serviciosJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Servicios HotClick',
  description: 'Servicios disponibles para clientes de HotClick Marketplace Costa Rica.',
  url: `${SITE_URL}/servicios`,
  numberOfItems: 2,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Service',
        name: 'Búsqueda de producto',
        description: 'Te ayudamos a encontrar cualquier producto que no esté en nuestro catálogo. Enviá tu solicitud y nuestro equipo lo busca por vos en Costa Rica.',
        provider: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
        areaServed: { '@type': 'Country', name: 'Costa Rica' },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/servicios`,
          servicePhone: '+506-8974-5370',
        },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CRC', availability: 'https://schema.org/InStock' },
      },
    },
    {
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'Service',
        name: 'Garantía de producto',
        description: 'Todos los productos de HotClick incluyen garantía. Reportá un problema con tu compra desde esta sección y te gestionamos la solución.',
        provider: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
        areaServed: { '@type': 'Country', name: 'Costa Rica' },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/servicios`,
        },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CRC', availability: 'https://schema.org/InStock' },
      },
    },
  ],
}

/* ─── Status badge solicitudes ───────────────────────────── */
const ESTADO_STYLES = {
  PENDIENTE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:     { color: 'var(--hc-muted)', bg: 'rgba(107,114,128,0.12)' },
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation()
  const cfg = ESTADO_STYLES[estado] || ESTADO_STYLES.PENDIENTE
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {t(`serviciosPage.status.${estado}`, { defaultValue: estado })}
    </span>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          {label}{required && <span className="ml-1" style={{ color: 'var(--hc-accent)' }}>*</span>}
        </label>
        {hint && <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  backgroundColor: 'var(--hc-surface-2)',
  border: '1.5px solid var(--hc-border)',
  color: 'var(--hc-text)',
  borderRadius: 12,
  outline: 'none',
  width: '100%',
  fontSize: 15,
  padding: '12px 16px',
  transition: 'border-color 0.2s',
}

/* ─── GarantiaCard con form de reporte inline ───────────── */
function GarantiaCard({ g, onReportado }) {
  const activa = g.activa
  const dias = g.diasRestantes
  const pct = activa ? Math.min(100, Math.round((dias / g.garantiaDias) * 100)) : 0
  let barColor = '#10b981'
  if (pct < 30) barColor = '#f59e0b'
  if (pct < 10) barColor = '#ef4444'
  if (!activa) barColor = 'var(--hc-muted)'

  const fechaVenc = new Date(g.fechaVencimiento).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const [abierto, setAbierto] = useState(false)
  const [desc, setDesc] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errForm, setErrForm] = useState('')

  const handleReportar = async () => {
    if (!desc.trim()) { setErrForm('Describí el problema antes de enviar.'); return }
    setEnviando(true); setErrForm('')
    try {
      await garantiaService.crearSolicitud({
        productoId: g.productoId,
        pedidoId: g.pedidoId,
        descripcion: desc.trim(),
      })
      setEnviado(true)
      setDesc('')
      onReportado?.()
    } catch {
      setErrForm('No se pudo enviar. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--hc-surface)',
        border: `1px solid ${activa ? 'rgba(23,71,168,0.3)' : 'var(--hc-border)'}`,
      }}>

      {/* Banner estado */}
      <div className="px-4 py-2 flex items-center justify-between"
        style={{
          backgroundColor: activa ? 'rgba(23,71,168,0.08)' : 'rgba(107,114,128,0.08)',
          borderBottom: `1px solid ${activa ? 'rgba(23,71,168,0.15)' : 'var(--hc-border)'}`,
        }}>
        <span className="text-xs font-bold flex items-center gap-1.5"
          style={{ color: activa ? 'var(--hc-accent)' : 'var(--hc-muted)' }}>
          🛡️ {activa ? 'Garantía activa' : 'Garantía vencida'}
        </span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: activa ? 'rgba(23,71,168,0.15)' : 'rgba(107,114,128,0.15)',
            color: activa ? 'var(--hc-accent)' : 'var(--hc-muted)',
          }}>
          No disponible
        </span>
      </div>

      {/* Info del producto */}
      <div className="p-4 flex gap-3">
        {g.imagenUrl ? (
          <img src={g.imagenUrl} alt={g.nombre}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid var(--hc-border)' }}
            onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
            <span className="text-2xl">📦</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug mb-1 truncate" style={{ color: 'var(--hc-text)' }}>
            {g.nombre}
          </p>
          <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
            Pedido #{g.numeroPedido} · entregado {new Date(g.fechaEntrega).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
          </p>
          <div className="h-1.5 rounded-full overflow-hidden mb-1.5"
            style={{ backgroundColor: 'var(--hc-surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs font-medium" style={{ color: activa ? barColor : '#6b7280' }}>
            {activa
              ? `${dias} día${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''} · vence ${fechaVenc}`
              : `Venció el ${fechaVenc}`}
          </p>
        </div>
      </div>

      {/* Botón reportar (solo garantía activa) */}
      {activa && !enviado && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setAbierto(v => !v)}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: abierto ? 'rgba(239,68,68,0.12)' : 'var(--hc-surface-2)',
              color: abierto ? '#ef4444' : 'var(--hc-muted)',
              border: `1px solid ${abierto ? 'rgba(239,68,68,0.3)' : 'var(--hc-border)'}`,
            }}>
            ⚠️ {abierto ? 'Cancelar reporte' : 'Reportar problema'}
          </button>

          <AnimatePresence>
            {abierto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="pt-3 space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Describí el problema con el producto: qué pasó, cuándo empezó, qué probaste..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className="w-full rounded-xl text-sm resize-none"
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--hc-surface-2)',
                      border: '1.5px solid var(--hc-border)',
                      color: 'var(--hc-text)',
                      outline: 'none',
                    }}
                  />
                  {errForm && (
                    <p className="text-xs text-red-400 font-medium">⚠ {errForm}</p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReportar}
                    disabled={enviando}
                    className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                    {enviando
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Enviando…</>
                      : '📩 Enviar solicitud de garantía'
                    }
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmación enviado */}
      {enviado && (
        <div className="px-4 pb-4">
          <div className="py-3 px-4 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}>
            ✅ Solicitud enviada — HotClick te contactará pronto.
          </div>
        </div>
      )}
    </div>
  )
}

const RATING_LABELS = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          aria-label={`${s} estrella${s !== 1 ? 's' : ''}`}
        >
          <svg className={`w-8 h-8 transition-colors duration-100 ${s <= active ? 'text-amber-400' : ''}`}
            viewBox="0 0 20 20"
            fill={s <= active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={s <= active ? 0 : 1.5}
            style={{ color: s <= active ? '#fbbf24' : 'var(--hc-border)' }}>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  )
}

/* ─── TestimonioCard — un producto con form inline ──────── */
function TestimonioCard({ p, onEnviado }) {
  const [abierto, setAbierto] = useState(false)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('La foto debe pesar menos de 5 MB.'); e.target.value = ''; return }
    setUploading(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await testimonioService.subirImagen(fd)
      setImagenUrl(res.data?.data?.url ?? res.data?.url ?? '')
    } catch { setErr('No se pudo subir la foto.') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleEnviar = async () => {
    if (!calificacion) { setErr('Seleccioná una calificación de 1 a 5 estrellas.'); return }
    if (!comentario.trim()) { setErr('Escribí tu comentario antes de enviar.'); return }
    setEnviando(true); setErr('')
    try {
      await testimonioService.crear({ productoId: p.productoId, comentario: comentario.trim(), imagenUrl: imagenUrl || undefined, calificacion })
      setEnviado(true)
      onEnviado?.()
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo enviar. Intentá de nuevo.')
    } finally { setEnviando(false) }
  }

  if (p.yaReseno || enviado) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        {p.imagenUrl
          ? <img src={p.imagenUrl} alt={p.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid var(--hc-border)' }} onError={e => { e.target.style.display = 'none' }} />
          : <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          {enviado
            ? <p className="text-xs font-semibold mt-0.5" style={{ color: '#f59e0b' }}>✅ Reseña enviada — ¡gracias!</p>
            : <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--hc-accent)' }}>✓ Ya dejaste una reseña</p>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${abierto ? 'rgba(245,158,11,0.35)' : 'var(--hc-border)'}` }}>

      {/* Cabecera del producto */}
      <button onClick={() => { setAbierto(v => !v); setErr('') }}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
        style={{ backgroundColor: abierto ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
        {p.imagenUrl
          ? <img src={p.imagenUrl} alt={p.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid var(--hc-border)' }} onError={e => { e.target.style.display = 'none' }} />
          : <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>📦</div>
        }
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {abierto ? 'Tocá para cerrar' : 'Tocá para dejar tu reseña'}
          </p>
        </div>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} style={{ color: 'var(--hc-muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3"
              style={{ borderTop: '1px solid var(--hc-border)' }}>

              {/* Selector de estrellas */}
              <div className="pt-3">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>
                  Calificación <span style={{ color: 'var(--hc-accent)' }}>*</span>
                </p>
                <div className="flex items-center gap-3">
                  <StarPicker value={calificacion} onChange={setCalificacion} />
                  {calificacion > 0 && (
                    <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                      {RATING_LABELS[calificacion]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <textarea rows={3} placeholder="¿Qué te pareció el producto? Tu experiencia ayuda a otros compradores…"
                  value={comentario} onChange={e => setComentario(e.target.value)}
                  maxLength={500}
                  className="w-full rounded-xl text-sm resize-none"
                  style={{ padding: '10px 14px', backgroundColor: 'var(--hc-surface-2)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)', outline: 'none' }} />
                <p className="text-right text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{comentario.length}/500</p>
              </div>


              {/* Foto opcional */}
              <div className="flex items-center gap-3">
                {imagenUrl ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1.5px solid var(--hc-border)' }}>
                    <img src={imagenUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImagenUrl('')}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">×</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold flex-shrink-0 transition-opacity disabled:opacity-50"
                    style={{ border: '2px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
                    {uploading
                      ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--hc-border)', borderTopColor: '#f59e0b' }} />
                      : <><span className="text-2xl leading-none" style={{ color: '#f59e0b' }}>📷</span><span>Foto</span></>
                    }
                  </button>
                )}
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Foto opcional · hasta 5 MB</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
              </div>

              {err && <p className="text-xs text-red-400 font-medium">⚠ {err}</p>}

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleEnviar} disabled={enviando || uploading}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                {enviando
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Enviando…</>
                  : '⭐ Enviar reseña'
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Botón volver ───────────────────────────────────────── */
function BotonVolver({ onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
      style={{ color: 'var(--hc-muted)' }}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a servicios
    </button>
  )
}

/* ─── Imágenes de tarjetas: local primero, Unsplash como respaldo ───────── */
const CARD_IMAGES = {
  busqueda: {
    local: '/servicios/busqueda.jpg',
    fallback: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    alt: 'Búsqueda de producto',
  },
  garantia: {
    local: '/servicios/garantia.jpg',
    fallback: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
    alt: 'Garantía de productos',
  },
  resena: {
    local: '/servicios/resena.jpg',
    fallback: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=800&q=80',
    alt: 'Dejar reseña',
  },
}

function ServiceCardImage({ type, className }) {
  const cfg = CARD_IMAGES[type]
  const [src, setSrc] = useState(cfg.local)
  return (
    <img
      src={src}
      alt={cfg.alt}
      className={className}
      onError={() => { if (src !== cfg.fallback) setSrc(cfg.fallback) }}
    />
  )
}

/* ─── Página principal ───────────────────────────────────── */
export default function ServiciosHotPage() {
  const { t } = useTranslation()
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const contenidoRef = useRef()

  const [vista, setVista] = useState('inicio')       // 'inicio' | 'busqueda' | 'garantia' | 'testimonio'
  const [tabBusqueda, setTabBusqueda] = useState('solicitar')

  const [fotos, setFotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const [phone, setPhone] = useState('')
  const [form, setForm] = useState({ descripcion: '', presupuesto: '', nombreContacto: '' })

  const { data: misSolicitudes, isLoading: loadingMias, refetch: refetchMias } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then(r => r.data),
    enabled: !!token && vista === 'busqueda' && tabBusqueda === 'mis-solicitudes',
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const { data: misGarantias, isLoading: loadingGarantias } = useQuery({
    queryKey: ['mis-garantias'],
    queryFn: () => garantiaService.misGarantias().then(r => r.data?.data ?? []),
    enabled: !!token && vista === 'garantia',
    refetchOnWindowFocus: true,
  })

  const { data: productosResenar, isLoading: loadingResenar, refetch: refetchResenar } = useQuery({
    queryKey: ['productos-para-resenar'],
    queryFn: () => testimonioService.getProductosParaResenar().then(r => r.data?.data ?? []),
    enabled: !!token && vista === 'testimonio',
    refetchOnWindowFocus: true,
  })

  const irA = (destino) => {
    setVista(destino)
    setError('')
    setTimeout(() => contenidoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const volver = () => {
    setVista('inicio')
    setSuccess(false)
    setTimeout(() => contenidoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const handleFotoChange = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3 - fotos.length)
    if (!files.length) return
    if (files.find(f => f.size > 5 * 1024 * 1024)) { setError('Cada foto debe pesar menos de 5 MB.'); e.target.value = ''; return }
    setUploading(true); setError('')
    try {
      const nuevas = await Promise.all(files.map(async (file) => {
        const preview = URL.createObjectURL(file)
        const fd = new FormData(); fd.append('file', file)
        const res = await servicioService.subirFoto(fd)
        return { file, preview, url: res.data?.url ?? res.data }
      }))
      setFotos(prev => [...prev, ...nuevas].slice(0, 3))
    } catch { setError(t('serviciosPage.uploadErrorFull')) }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError(t('serviciosPage.errorDescRequired')); return }
    if (!phone || phone.replace(/\D/g, '').length < 7) { setError('Por favor ingresá un número de teléfono válido.'); return }
    setSending(true); setError('')
    try {
      await servicioService.crear({
        ...form, telefonoContacto: phone,
        fotosUrls: fotos.length ? JSON.stringify(fotos.map(f => f.url)) : null,
      })
      setSuccess(true)
      setForm({ descripcion: '', presupuesto: '', nombreContacto: '' })
      setPhone(''); setFotos([])
    } catch { setError(t('serviciosPage.sendErrorFull')) }
    finally { setSending(false) }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Helmet>
        <title>Servicios HotClick — Búsqueda de productos y garantías en Costa Rica</title>
        <meta name="description" content="Solicitá búsqueda de cualquier producto o gestioná la garantía de tu compra. Servicios gratuitos para clientes de HotClick en Costa Rica." />
        <link rel="canonical" href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hreflang="es-CR" href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hreflang="es"    href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Servicios HotClick — Búsqueda y garantías en Costa Rica" />
        <meta property="og:description" content="Te buscamos el producto que necesitás y gestionamos garantías. Gratis para todos los clientes de HotClick." />
        <meta property="og:url" content={`${SITE_URL}/servicios`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(serviciosJsonLd)}</script>
      </Helmet>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="pt-20 sm:pt-28 pb-10 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(23,71,168,0.1) 0%, transparent 70%)' }} />
        <motion.div className="relative max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-5 tracking-wide uppercase"
            style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }}>
            ✦ Servicios HOT
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight" style={{ color: 'var(--hc-text)' }}>
            ¿En qué te podemos{' '}
            <span style={{ color: 'var(--hc-accent)' }}>ayudar?</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Tocá el servicio que necesitás.
          </p>
        </motion.div>
      </section>

      {/* ── CONTENIDO ────────────────────────────────── */}
      <div ref={contenidoRef} className="px-4 pb-28 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">

          {/* ════ INICIO — cards de servicio ════ */}
          {vista === 'inicio' && (
            <motion.div key="inicio"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="grid sm:grid-cols-2 gap-5">

              {/* Card — Búsqueda */}
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => irA('busqueda')}
                className="text-left rounded-3xl overflow-hidden relative group cursor-pointer"
                style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: 'var(--hc-surface)' }}>

                {/* Imagen de fondo */}
                <div className="relative h-44 overflow-hidden">
                  <ServiceCardImage type="busqueda" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(23,71,168,0.85) 0%, rgba(23,71,168,0.2) 50%, transparent 100%)' }} />
                  {/* Ícono flotante */}
                  <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    🔍
                  </div>
                  {/* Badge */}
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(23,71,168,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Gratis
                  </span>
                  {/* Flecha */}
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Texto */}
                <div className="p-5">
                  <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
                    Buscar producto por ti
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                    Describí o enviá una foto del producto que buscás y nosotros lo conseguimos.
                  </p>
                </div>
              </motion.button>

              {/* Card — Garantía */}
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => irA('garantia')}
                className="text-left rounded-3xl overflow-hidden relative group cursor-pointer"
                style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: 'var(--hc-surface)' }}>

                {/* Imagen de fondo */}
                <div className="relative h-44 overflow-hidden">
                  <ServiceCardImage type="garantia" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(23,71,168,0.88) 0%, rgba(23,71,168,0.2) 50%, transparent 100%)' }} />
                  {/* Ícono flotante */}
                  <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    🛡️
                  </div>
                  {/* Badge */}
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(23,71,168,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Incluida
                  </span>
                  {/* Flecha */}
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Texto */}
                <div className="p-5">
                  <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
                    Garantía de productos
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                    Revisá la garantía activa de los productos que compraste en HotClick.
                  </p>
                </div>
              </motion.button>

              {/* Card — Testimonios */}
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => irA('testimonio')}
                className="text-left rounded-3xl overflow-hidden relative group cursor-pointer sm:col-span-2"
                style={{ border: '1px solid rgba(245,158,11,0.2)', backgroundColor: 'var(--hc-surface)' }}>

                <div className="relative h-44 overflow-hidden">
                  <ServiceCardImage type="resena" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(180,83,9,0.88) 0%, rgba(245,158,11,0.2) 50%, transparent 100%)' }} />
                  <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    ⭐
                  </div>
                  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: 'rgba(180,83,9,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    Beneficio
                  </span>
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
                    Dejá tu reseña
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                    Compartí tu experiencia con productos que compraste. Una reseña por producto, con beneficio en tu próxima compra.
                  </p>
                </div>
              </motion.button>

            </motion.div>
          )}

          {/* ════ BÚSQUEDA DE PRODUCTO ════ */}
          {vista === 'busqueda' && (
            <motion.div key="busqueda"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}>

              <BotonVolver onClick={volver} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
                style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
                <span className="text-3xl">🔍</span>
                <div>
                  <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Buscar producto por ti</h2>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Describí o enviá fotos y te lo conseguimos.</p>
                </div>
              </div>

              {/* Sub-tabs */}
              {token && (
                <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ backgroundColor: 'var(--hc-surface)' }}>
                  {[{ key: 'solicitar', label: '+ Nueva solicitud' }, { key: 'mis-solicitudes', label: 'Mis solicitudes' }].map(tb => (
                    <button key={tb.key} onClick={() => setTabBusqueda(tb.key)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
                      style={{
                        backgroundColor: tabBusqueda === tb.key ? 'var(--hc-accent)' : 'transparent',
                        color: tabBusqueda === tb.key ? '#fff' : 'var(--hc-muted)',
                      }}>
                      {tb.label}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {tabBusqueda === 'solicitar' && (
                  <motion.div key="form-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {success ? (
                      <div className="text-center py-16 rounded-3xl"
                        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                        <div className="text-6xl mb-5">🎉</div>
                        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--hc-text)' }}>
                          {t('serviciosPage.successTitle')}
                        </h2>
                        <p className="text-sm mb-8" style={{ color: 'var(--hc-muted)' }}>
                          {t('serviciosPage.successSub2')}
                        </p>
                        <button onClick={() => { setSuccess(false); setTabBusqueda(token ? 'mis-solicitudes' : 'solicitar') }}
                          className="px-8 py-3 rounded-2xl text-sm font-bold"
                          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                          {token ? t('serviciosPage.viewMine') : t('serviciosPage.newRequestBtn')}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleEnviar} className="rounded-3xl p-6 sm:p-8 space-y-6"
                        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                        <Field label={t('serviciosPage.descLabelFull')} required>
                          <textarea rows={4} placeholder={t('serviciosPage.descPhFull')}
                            value={form.descripcion}
                            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                            style={{ ...inputStyle, resize: 'none' }} />
                        </Field>

                        <Field label={t('serviciosPage.photosLabelFull')} hint="Máx. 3 · hasta 5 MB c/u">
                          <div className="flex flex-wrap gap-3">
                            {fotos.map((f, i) => (
                              <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
                                style={{ border: '1.5px solid var(--hc-border)' }}>
                                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setFotos(p => p.filter((_, x) => x !== i))}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center font-bold leading-none">×</button>
                              </div>
                            ))}
                            {fotos.length < 3 && (
                              <motion.button type="button" onClick={() => fileRef.current?.click()}
                                disabled={uploading} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0"
                                style={{ border: '2px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
                                {uploading
                                  ? <div className="w-5 h-5 rounded-full border-2 animate-spin"
                                      style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                                  : <><span className="text-3xl leading-none" style={{ color: 'var(--hc-accent)' }}>+</span><span>Foto</span></>
                                }
                              </motion.button>
                            )}
                          </div>
                          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
                          <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>⏱ Respuesta en menos de 24 horas</p>
                        </Field>

                        <Field label={t('serviciosPage.budgetLabelFull')} hint="Opcional">
                          <input type="text" placeholder={t('serviciosPage.budgetPhFull')}
                            value={form.presupuesto}
                            onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
                            style={inputStyle} />
                        </Field>

                        <PhoneField label="Número de teléfono" value={phone} onChange={setPhone} required hint="Te avisamos por WhatsApp" />

                        {!token && (
                          <Field label="Tu nombre" hint="Opcional">
                            <input type="text" placeholder="Ej: María García"
                              value={form.nombreContacto}
                              onChange={e => setForm(f => ({ ...f, nombreContacto: e.target.value }))}
                              style={inputStyle} />
                          </Field>
                        )}

                        {error && <p className="text-sm px-4 py-3 rounded-2xl bg-red-500/10 text-red-400 font-medium">⚠ {error}</p>}

                        <motion.button type="submit" disabled={sending || uploading}
                          whileHover={{ scale: sending ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
                          className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50"
                          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                          {sending
                            ? <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                {t('serviciosPage.sending')}
                              </span>
                            : `📩 ${t('serviciosPage.submit')}`
                          }
                        </motion.button>
                      </form>
                    )}
                  </motion.div>
                )}

                {tabBusqueda === 'mis-solicitudes' && token && (
                  <motion.div key="mis-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {loadingMias ? (
                      <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
                        <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
                          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                        {t('serviciosPage.loading')}
                      </div>
                    ) : !misSolicitudes?.length ? (
                      <div className="text-center py-16 rounded-3xl"
                        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                        <div className="text-5xl mb-4">📋</div>
                        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin solicitudes aún</p>
                        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Creá una solicitud y te buscamos el producto.</p>
                        <button onClick={() => setTabBusqueda('solicitar')}
                          className="px-6 py-3 rounded-2xl text-sm font-bold"
                          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                          Nueva solicitud
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <button onClick={() => refetchMias()}
                            className="text-xs px-3 py-1.5 rounded-xl font-semibold"
                            style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
                            ↻ Actualizar
                          </button>
                        </div>
                        {misSolicitudes.map(s => {
                          const fotosS = (() => { try { return s.fotosUrls ? JSON.parse(s.fotosUrls) : [] } catch { return [] } })()
                          const hasNote = s.notasAdmin?.trim()
                          return (
                            <div key={s.id} className="rounded-2xl overflow-hidden"
                              style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${hasNote ? 'rgba(23,71,168,0.35)' : 'var(--hc-border)'}` }}>
                              {hasNote && (
                                <div className="px-5 py-3 flex items-start gap-2"
                                  style={{ backgroundColor: 'rgba(23,71,168,0.1)', borderBottom: '1px solid rgba(23,71,168,0.2)' }}>
                                  <span className="text-base shrink-0">💬</span>
                                  <div>
                                    <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--hc-accent)' }}>Respuesta de HotClick</p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.notasAdmin}</p>
                                  </div>
                                </div>
                              )}
                              <div className="p-5">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <EstadoBadge estado={s.estado} />
                                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                                    {new Date(s.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Tu solicitud</p>
                                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.descripcion}</p>
                                </div>
                                {s.presupuesto && (
                                  <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
                                    {t('serviciosPage.budgetShowLabel')} {s.presupuesto}
                                  </p>
                                )}
                                {fotosS.length > 0 && (
                                  <div className="flex gap-2">
                                    {fotosS.map((url, i) => (
                                      <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover"
                                        style={{ border: '1px solid var(--hc-border)' }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ════ GARANTÍA ════ */}
          {vista === 'garantia' && (
            <motion.div key="garantia"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}>

              <BotonVolver onClick={volver} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
                style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
                <span className="text-3xl">🛡️</span>
                <div>
                  <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Garantía de productos</h2>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Estado de garantía de tus productos HotClick.
                  </p>
                </div>
              </div>

              {!token ? (
                <div className="text-center py-16 rounded-3xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-5xl mb-4">🔐</div>
                  <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Iniciá sesión para ver tus garantías</p>
                  <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Tus garantías activas aparecen vinculadas a tu cuenta.</p>
                  <button onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-2xl text-sm font-bold"
                    style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                    Iniciar sesión
                  </button>
                </div>
              ) : loadingGarantias ? (
                <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
                  <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                  Cargando garantías…
                </div>
              ) : !misGarantias?.length ? (
                <div className="text-center py-16 rounded-3xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-5xl mb-4">🛡️</div>
                  <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin garantías registradas</p>
                  <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
                    Los productos comprados con garantía aparecerán aquí una vez entregados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const activas = misGarantias.filter(g => g.activa).length
                    const vencidas = misGarantias.length - activas
                    return (
                      <div className="flex gap-3 mb-2">
                        <div className="flex-1 text-center p-3 rounded-2xl"
                          style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
                          <p className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>{activas}</p>
                          <p className="text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>Activa{activas !== 1 ? 's' : ''}</p>
                        </div>
                        {vencidas > 0 && (
                          <div className="flex-1 text-center p-3 rounded-2xl"
                            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                            <p className="text-2xl font-black" style={{ color: 'var(--hc-muted)' }}>{vencidas}</p>
                            <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Vencida{vencidas !== 1 ? 's' : ''}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {misGarantias.map((g, i) => (
                    <GarantiaCard
                      key={`${g.productoId}-${i}`}
                      g={g}
                      onReportado={() => qc.invalidateQueries({ queryKey: ['mis-garantias-solicitudes'] })}
                    />
                  ))}
                  <p className="text-xs text-center pt-2" style={{ color: 'var(--hc-muted)' }}>
                    ¿Problema con un producto?{' '}
                    <a href="https://wa.me/50689745370" target="_blank" rel="noopener noreferrer"
                      className="font-semibold" style={{ color: 'var(--hc-accent)' }}>
                      Contactanos por WhatsApp
                    </a>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ════ TESTIMONIOS ════ */}
          {vista === 'testimonio' && (
            <motion.div key="testimonio"
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}>

              <BotonVolver onClick={volver} />

              {/* Header */}
              <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span className="text-3xl">⭐</span>
                <div>
                  <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Dejá tu reseña</h2>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Una reseña por producto. Tus comentarios ayudan a otros compradores.</p>
                </div>
              </div>

              {/* Banner beneficio */}
              <div className="mb-6 p-4 rounded-2xl flex items-start gap-3"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <span className="text-xl flex-shrink-0">🎁</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>Beneficio por reseñar</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                    Al dejar tu reseña, HotClick te contactará con un beneficio especial para tu próxima compra.
                  </p>
                </div>
              </div>

              {!token ? (
                <div className="text-center py-16 rounded-3xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-5xl mb-4">🔐</div>
                  <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Iniciá sesión para dejar una reseña</p>
                  <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Solo se pueden reseñar productos que hayas comprado.</p>
                  <button onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-2xl text-sm font-bold"
                    style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                    Iniciar sesión
                  </button>
                </div>
              ) : loadingResenar ? (
                <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
                  <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: '#f59e0b' }} />
                  Cargando tus productos…
                </div>
              ) : !productosResenar?.length ? (
                <div className="text-center py-16 rounded-3xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-5xl mb-4">📦</div>
                  <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin compras registradas</p>
                  <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
                    Los productos de pedidos entregados aparecerán aquí para que puedas reseñarlos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const pendientes = productosResenar.filter(p => !p.yaReseno).length
                    return pendientes > 0 && (
                      <p className="text-sm font-semibold px-1 mb-1" style={{ color: 'var(--hc-muted)' }}>
                        {pendientes} producto{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de reseña
                      </p>
                    )
                  })()}
                  {productosResenar.map((p, i) => (
                    <TestimonioCard key={`${p.productoId}-${i}`} p={p} onEnviado={() => refetchResenar()} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <Footer />
    </div>
  )
}
