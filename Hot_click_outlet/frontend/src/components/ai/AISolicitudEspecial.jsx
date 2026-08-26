/**
 * AISolicitudEspecial — formulario para solicitar un producto que no está en catálogo.
 * Aparece inline dentro de AIHeroSearch cuando la búsqueda por imagen no da resultados.
 */
import { useState } from 'react'
import api from '@/services/api'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { Field, FotoReferencia, inputStyle } from './AISolicitudEspecialFields'

const WA_REGEX = /^[2-9]\d{7}$/

export default function AISolicitudEspecial({ descripcionInicial = '', onSuccess, onCancel }) {
  const [form, setForm] = useState({
    nombre: '', whatsapp: '', correo: '', descripcion: descripcionInicial, imagen: null,
  })
  const [errors, setErrors] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [enviado, setEnviado] = useState(false)

  function setCampo(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  function onImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar 5MB.'); return }
    setCampo('imagen', file)
    setImagenPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Ingresá tu nombre'
    const wa = form.whatsapp.replace(/\D/g, '')
    if (!WA_REGEX.test(wa)) e.whatsapp = 'Número de WhatsApp inválido (8 dígitos CR)'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setEnviando(true)
    try {
      const formData = new FormData()
      formData.append('nombre', form.nombre.trim())
      formData.append('whatsapp', form.whatsapp.replace(/\D/g, ''))
      if (form.correo.trim()) formData.append('correo', form.correo.trim())
      if (form.descripcion.trim()) formData.append('descripcion', form.descripcion.trim())
      if (form.imagen) formData.append('imagen', form.imagen)
      formData.append('empresaSlug', 'hotclick')

      await api.post('/public/solicitud-especial', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEnviado(true)
      setTimeout(() => onSuccess?.(), 2500)
    } catch (err) {
      console.error('[solicitud-especial] no se pudo enviar', err)
      setErrors({ submit: 'No se pudo enviar. Intentá de nuevo en un momento.' })
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <div className="mb-1 flex justify-center" style={{ color: '#4ade80' }}>
          <TrustGlyph tipo="check" className="w-8 h-8" />
        </div>
        <p className="font-bold text-sm" style={{ color: '#4ade80' }}>¡Solicitud enviada!</p>
        <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
          El equipo de HotClick te contacta pronto por WhatsApp.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Solicitud especial</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Decinos qué buscás y te lo conseguimos
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs hover:opacity-60 transition-opacity" style={{ color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
        )}
      </div>

      <Field label="Nombre *" error={errors.nombre}>
        <input
          value={form.nombre}
          onChange={e => setCampo('nombre', e.target.value)}
          placeholder="Tu nombre"
          maxLength={100}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle(errors.nombre)}
        />
      </Field>

      <Field label="WhatsApp *" error={errors.whatsapp}>
        <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl" style={inputStyle(errors.whatsapp)}>
          <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>+506</span>
          <input
            value={form.whatsapp}
            onChange={e => setCampo('whatsapp', e.target.value)}
            placeholder="8888 8888"
            maxLength={12}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--hc-text)' }}
            inputMode="tel"
          />
        </div>
      </Field>

      <Field label="Correo (opcional)">
        <input
          value={form.correo}
          onChange={e => setCampo('correo', e.target.value)}
          placeholder="tu@correo.com"
          type="email"
          maxLength={150}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle()}
        />
      </Field>

      <Field label="¿Qué estás buscando?">
        <textarea
          value={form.descripcion}
          onChange={e => setCampo('descripcion', e.target.value)}
          placeholder="Describí el producto que necesitás, tus usos, presupuesto..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={inputStyle()}
        />
      </Field>

      <FotoReferencia
        imagenPreview={imagenPreview}
        onClear={() => { setImagenPreview(null); setCampo('imagen', null) }}
        onImageChange={onImageChange}
      />

      {errors.submit && (
        <p className="text-xs text-red-400">{errors.submit}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--hc-accent)', color: '#fff' }}
      >
        {enviando ? 'Enviando...' : <TextoFlecha>Enviar solicitud</TextoFlecha>}
      </button>
    </form>
  )
}
