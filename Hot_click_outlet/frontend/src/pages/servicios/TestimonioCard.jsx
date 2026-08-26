import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { testimonioService } from '@/services/testimonioService'
import { FOTO_MAX_BYTES, RATING_LABELS } from './serviciosHelpers'
import CloseIcon from '@/components/ui/CloseIcon'
import StarPicker from './StarPicker'

function PackageIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function CameraIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function StarStrokeIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function WarnIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ProductoThumb({ p }) {
  if (p.imagenUrl) {
    return (
      <img src={p.imagenUrl} alt={p.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: '1px solid var(--hc-border)' }} onError={e => { e.target.style.display = 'none' }} />
    )
  }
  return (
    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
      <PackageIcon />
    </div>
  )
}

export default function TestimonioCard({ p, onEnviado }) {
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
    if (file.size > FOTO_MAX_BYTES) { setErr('La foto debe pesar menos de 5 MB.'); e.target.value = ''; return }
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
        <ProductoThumb p={p} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          {enviado
            ? <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: '#f59e0b' }}><CheckIcon /> Reseña enviada — ¡gracias!</p>
            : <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: 'var(--hc-accent)' }}><CheckIcon /> Ya dejaste una reseña</p>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${abierto ? 'rgba(245,158,11,0.35)' : 'var(--hc-border)'}` }}>

      <button type="button" onClick={() => { setAbierto(v => !v); setErr('') }}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
        style={{ backgroundColor: abierto ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
        <ProductoThumb p={p} />
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

              <div className="flex items-center gap-3">
                {imagenUrl ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1.5px solid var(--hc-border)' }}>
                    <img src={imagenUrl} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImagenUrl('')} aria-label="Quitar foto"
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold flex-shrink-0 transition-opacity disabled:opacity-50"
                    style={{ border: '2px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
                    {uploading
                      ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--hc-border)', borderTopColor: '#f59e0b' }} />
                      : <><CameraIcon className="w-6 h-6" /><span>Foto</span></>
                    }
                  </button>
                )}
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Foto opcional · hasta 5 MB</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
              </div>

              {err && <p className="text-xs text-red-400 font-medium flex items-center gap-1.5"><WarnIcon /> {err}</p>}

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleEnviar} disabled={enviando || uploading}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
                {enviando
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Enviando…</>
                  : <><StarStrokeIcon /> Enviar reseña</>
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
