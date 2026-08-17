import { useState } from 'react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { testimonioService } from '@/services/testimonioService'
import ImagenPicker from './ImagenPicker'
import useImageUpload from './useImageUpload'

export default function TestimonioForm() {
  const toast = useToast()
  const img = useImageUpload(toast)
  const [comentario, setComentario] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

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
        <label htmlFor="profile-comentario" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
          Tu comentario <span style={{ color: 'var(--hc-accent)' }}>*</span>
        </label>
        <textarea id="profile-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)}
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
