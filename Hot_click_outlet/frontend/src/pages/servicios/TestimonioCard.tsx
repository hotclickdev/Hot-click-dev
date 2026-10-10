import { useState, useRef, type ChangeEvent, type SyntheticEvent } from 'react'
import { testimonioService } from '@/services/testimonioService'
import { FOTO_MAX_BYTES, RATING_LABELS, type ProductoParaResena } from './serviciosHelpers'
import CloseIcon from '@/components/ui/CloseIcon'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import StarPicker from './StarPicker'
import type { JsonBody } from '@/types/api'

function PackageIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function CameraIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function StarStrokeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function WarnIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ProductoThumb({ p }: { p: ProductoParaResena }) {
  if (p.imagenUrl) {
    return (
      <img src={p.imagenUrl} alt={p.nombre} className="size-12 shrink-0 rounded-[10px] border border-hc-n-200 object-cover" onError={(e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }} />
    )
  }
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-hc-n-100 text-hc-n-400"><PackageIcon /></div>
  )
}

function mensajeAxios(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  const response = (err as { response?: { data?: { message?: unknown } } }).response
  return typeof response?.data?.message === 'string' ? response.data.message : undefined
}

function urlImagenSubida(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const envelope = data as { data?: { url?: unknown }; url?: unknown }
  if (typeof envelope.data?.url === 'string') return envelope.data.url
  if (typeof envelope.url === 'string') return envelope.url
  return ''
}

/** Reseña de un producto comprado (derivado de Figma: tarjetas y campos del manual de marca, acordeón en tarjeta clara). */
export default function TestimonioCard({ p, onEnviado }: { p: ProductoParaResena; onEnviado?: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > FOTO_MAX_BYTES) { setErr('La foto debe pesar menos de 5 MB.'); e.target.value = ''; return }
    setUploading(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await testimonioService.subirImagen(fd)
      setImagenUrl(urlImagenSubida(res.data))
    } catch { setErr('No se pudo subir la foto.') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleEnviar = async () => {
    if (!calificacion) { setErr('Seleccioná una calificación de 1 a 5 estrellas.'); return }
    if (!comentario.trim()) { setErr('Escribí tu comentario antes de enviar.'); return }
    setEnviando(true); setErr('')
    try {
      const crear = (testimonioService as unknown as { crear: (data: JsonBody) => Promise<unknown> }).crear
      await crear({ productoId: p.productoId, comentario: comentario.trim(), imagenUrl: imagenUrl || undefined, calificacion })
      setEnviado(true)
      onEnviado?.()
    } catch (e: unknown) {
      setErr(mensajeAxios(e) || 'No se pudo enviar. Intentá de nuevo.')
    } finally { setEnviando(false) }
  }

  if (p.yaReseno || enviado) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 leading-[normal]">
        <ProductoThumb p={p} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-hc-n-900">{p.nombre}</p>
          {enviado
            ? <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-hc-success-text"><CheckIcon /> Reseña enviada — ¡gracias!</p>
            : <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-hc-blue-600"><CheckIcon /> Ya dejaste una reseña</p>
          }
        </div>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-[14px] border bg-hc-n-0 leading-[normal] ${abierto ? 'border-hc-blue-600' : 'border-hc-n-200'}`}>
      <button type="button" onClick={() => { setAbierto(v => !v); setErr('') }}
        aria-expanded={abierto}
        className={`flex w-full items-center gap-3 px-[14px] py-3 text-left ${abierto ? 'bg-hc-blue-50' : ''}`}>
        <ProductoThumb p={p} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-hc-n-900">{p.nombre}</p>
          <p className="mt-0.5 text-[12px] text-hc-n-600">
            {abierto ? 'Tocá para cerrar' : 'Tocá para dejar tu reseña'}
          </p>
        </div>
        <IconoFigma src={ICONOS_COMPRADOR.chevronAbajo} size={16} className={`shrink-0 text-hc-n-600 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="flex flex-col gap-[14px] border-t border-hc-n-200 px-[14px] pb-4 pt-3">
          <div className="flex flex-col gap-[6px]">
            <p className="text-[13px] font-semibold text-hc-n-900">Calificación</p>
            <div className="flex items-center gap-3">
              <StarPicker value={calificacion} onChange={setCalificacion} />
              {calificacion > 0 && (
                <span className="text-[13px] font-semibold text-hc-blue-600">{RATING_LABELS[calificacion]}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor={`resena-${p.productoId}`} className="text-[13px] font-semibold text-hc-n-900">Tu comentario</label>
            <textarea id={`resena-${p.productoId}`} rows={3} placeholder="¿Qué te pareció el producto? Tu experiencia ayuda a otros compradores…"
              value={comentario} onChange={e => setComentario(e.target.value)}
              maxLength={500}
              className="hc-input-libre w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-5 text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600" />
            <p className="text-right text-[12px] text-hc-n-600">{comentario.length}/500</p>
          </div>

          <div className="flex items-center gap-3">
            {imagenUrl ? (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-[10px] border border-hc-n-200">
                <img src={imagenUrl} alt="" className="size-full object-cover" />
                <button type="button" onClick={() => setImagenUrl('')} aria-label="Quitar foto"
                  className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-hc-n-900 text-hc-n-0">
                  <CloseIcon className="size-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-hc-n-400 text-[11px] font-semibold text-hc-n-600 disabled:opacity-50">
                {uploading
                  ? <span className="size-4 animate-spin rounded-full border-2 border-hc-blue-100 border-t-hc-blue-600" />
                  : <><CameraIcon className="size-5" /><span>Foto</span></>
                }
              </button>
            )}
            <p className="text-[12px] leading-4 text-hc-n-600">Foto opcional · hasta 5 MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>

          {err && <p role="alert" className="flex items-center gap-1.5 text-[12px] font-medium leading-4 text-hc-danger"><WarnIcon /> {err}</p>}

          <button type="button" onClick={handleEnviar} disabled={enviando || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0 disabled:opacity-50">
            {enviando
              ? <><span className="size-4 animate-spin rounded-full border-2 border-hc-n-0/30 border-t-hc-n-0" /> Enviando…</>
              : <><StarStrokeIcon /> Enviar reseña</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
