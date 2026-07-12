import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { soporteService } from '@/services/soporteService'
import { useToast } from '@/components/ui/Toast'

const inputStyle = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }

export default function AdminAyuda() {
  const { showToast } = useToast()
  const fileRef = useRef(null)

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const canSubmit = titulo.trim() && descripcion.trim() && !enviando && !subiendoFoto

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { showToast('El archivo debe ser una imagen', 'error'); return }
    if (f.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5 MB', 'error'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const quitarFoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setEnviando(true)
    try {
      let fotoUrl = null
      if (file) {
        setSubiendoFoto(true)
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await soporteService.subirFoto(fd)
        fotoUrl = data?.data?.url ?? data?.url ?? null
        setSubiendoFoto(false)
      }
      await soporteService.crearTicket({ titulo: titulo.trim(), descripcion: descripcion.trim(), fotoUrl })
      setEnviado(true)
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al enviar el reporte', 'error')
    } finally {
      setEnviando(false)
      setSubiendoFoto(false)
    }
  }

  if (enviado) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: '#e2f1e8' }}>
          <svg className="w-7 h-7" style={{ color: '#1E7F4F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>¡Listo, lo recibimos!</h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          El equipo de HotClick va a revisar tu reporte y te va a contactar por correo o WhatsApp.
        </p>
        <button
          onClick={() => { setTitulo(''); setDescripcion(''); quitarFoto(); setEnviado(false) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          Reportar otro problema
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <header>
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Ayuda</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          ¿Algo no funciona como esperabas? Contanos qué pasó y te ayudamos.
        </p>
      </header>

      <form onSubmit={enviar} className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>¿Qué título le ponés? *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: No puedo subir fotos de un producto"
            maxLength={150}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Contanos qué pasó *</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describí el problema con el mayor detalle posible…"
            rows={5}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-y"
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
            Foto <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(opcional, ayuda mucho)</span>
          </label>
          {preview ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={quitarFoto}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs">
                ✕
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-32 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[11px]">Agregar foto</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={!canSubmit}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
            {subiendoFoto ? 'Subiendo foto…' : enviando ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </div>
      </form>

      <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
        ¿Preferís hablar directo? Escribinos por{' '}
        <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: 'var(--hc-accent)' }}>
          WhatsApp
        </a>.
      </p>
    </div>
  )
}
