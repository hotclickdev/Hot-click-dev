import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'

const PLAN_COLOR = {
  GRATUITO:   'bg-gray-500/15 text-gray-400',
  BASICO:     'bg-blue-500/15 text-blue-400',
  PRO:        'bg-purple-500/15 text-purple-400',
  ENTERPRISE: 'bg-orange-500/15 text-orange-400',
}
const ESTADO_COLOR = {
  ACTIVO:               'bg-green-500/15 text-green-400',
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  SUSPENDIDO:           'bg-red-500/15 text-red-400',
  RECHAZADO:            'bg-red-500/15 text-red-400',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AdminMiEmpresa() {
  const userRole = useAuthStore(s => s.userRole)
  const [empresa, setEmpresa]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [toast, setToast]         = useState(null)
  const fileInputRef = useRef(null)
  const [form, setForm]         = useState({
    nombreComercial: '', descripcion: '', telefonoEmpresa: '',
    correoEmpresa: '', numeroWhatsapp: '',
    colorPrimario: '#FF4B12', colorSecundario: '#1A1A2E', logoUrl: '',
  })
  const [fotos, setFotos]       = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef(null)
  // logoUrl se maneja separado del PUT — se actualiza via POST /logo directamente
  const [errors, setErrors] = useState({})

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await api.get('/empresa/perfil')
      const e = data.data
      setEmpresa(e)
      setForm({
        nombreComercial:  e.nombreComercial  ?? '',
        descripcion:      e.descripcion      ?? '',
        telefonoEmpresa:  e.telefonoEmpresa  ?? '',
        correoEmpresa:    e.correoEmpresa    ?? '',
        numeroWhatsapp:   e.numeroWhatsapp   ?? '',
        colorPrimario:    e.colorPrimario    ?? '#FF4B12',
        colorSecundario:  e.colorSecundario  ?? '#1A1A2E',
        logoUrl:          e.logoUrl          ?? '',
      })
      // fotos guardadas en descripcion como JSON si hay prefijo [FOTOS]
      try {
        const match = (e.descripcion ?? '').match(/\[FOTOS\](.*?)(\[\/FOTOS\]|$)/s)
        if (match) setFotos(JSON.parse(match[1]))
      } catch { /* sin fotos */ }
    } catch {
      showToast('Error al cargar perfil de empresa', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoFile = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/empresa/perfil/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = data?.data ?? data
      setForm(s => ({ ...s, logoUrl: url }))
      showToast('Logo subido correctamente')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error al subir el logo', 'error')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleLogoFile(file)
  }

  function validate() {
    const e = {}
    if (!form.nombreComercial.trim()) e.nombreComercial = 'El nombre comercial es requerido'
    return e
  }

  async function guardar(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      // Serializar fotos dentro de la descripción
      const fotosTag = fotos.length
        ? `\n[FOTOS]${JSON.stringify(fotos)}[/FOTOS]`
        : ''
      const descClean = form.descripcion.trim().replace(/\[FOTOS\].*?(\[\/FOTOS\]|$)/s, '').trim()
      await api.put('/empresa/perfil', {
        nombreComercial: form.nombreComercial.trim(),
        descripcion:     descClean + fotosTag,
        telefonoEmpresa: form.telefonoEmpresa.trim(),
        correoEmpresa:   form.correoEmpresa.trim(),
        numeroWhatsapp:  form.numeroWhatsapp.trim(),
        colorPrimario:   form.colorPrimario,
        colorSecundario: form.colorSecundario,
      })
      showToast('Perfil de empresa actualizado')
      cargar()
    } catch {
      showToast('Error al guardar cambios', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleFotoFile = useCallback(async (file) => {
    if (!file) return
    if (fotos.length >= 8) { showToast('Máximo 8 fotos por galería', 'error'); return }
    setUploadingFoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/empresa/perfil/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = data?.data ?? data
      setFotos(prev => [...prev, url])
      showToast('Foto agregada')
    } catch {
      showToast('Error al subir la foto', 'error')
    } finally {
      setUploadingFoto(false)
    }
  }, [fotos])

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const canEdit = userRole === 'EMPRENDEDOR' || userRole === 'ADMIN_IT'

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</div>
      </AdminLayout>
    )
  }

  if (!empresa) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>No se encontró la empresa asociada a tu cuenta.</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi empresa</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Configura el perfil público de tu empresa en HOTCLICK</p>
        </div>

        {/* Estado y plan */}
        <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="flex-1 min-w-0">
            <div className="font-semibold" style={{ color: 'var(--hc-text)' }}>{empresa.nombreEmpresa}</div>
            <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--hc-muted)' }}>/{empresa.slug}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLOR[empresa.planSaas] ?? ''}`}>
              {empresa.planSaas}
            </span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[empresa.estadoEmpresa] ?? ''}`}>
              {empresa.estadoEmpresa?.replace('_', ' ')}
            </span>
          </div>
          <div className="w-full grid grid-cols-2 gap-3 mt-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
            <span>Registro: <strong style={{ color: 'var(--hc-text)' }}>{fmtDate(empresa.fechaRegistro)}</strong></span>
            {empresa.fechaAprobacion && (
              <span>Aprobación: <strong style={{ color: 'var(--hc-text)' }}>{fmtDate(empresa.fechaAprobacion)}</strong></span>
            )}
          </div>
          {empresa.estadoEmpresa === 'PENDIENTE_APROBACION' && (
            <div className="w-full mt-2 px-3 py-2 rounded-lg text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Tu empresa está pendiente de aprobación por el equipo de HOTCLICK. Te notificaremos por correo cuando sea aprobada.
            </div>
          )}
        </div>

        {/* Formulario editable */}
        <form onSubmit={guardar} className="space-y-5">
          <Section title="Información pública">
            <Field label="Nombre comercial" error={errors.nombreComercial} required>
              <input
                value={form.nombreComercial}
                onChange={e => setForm(s => ({ ...s, nombreComercial: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.nombreComercial ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                value={form.descripcion}
                onChange={e => setForm(s => ({ ...s, descripcion: e.target.value }))}
                rows={3}
                disabled={!canEdit}
                placeholder="Describe brevemente tu empresa y lo que ofrecés…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
            </Field>
          </Section>

          <Section title="Contacto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Correo de la empresa">
                <input
                  type="email"
                  value={form.correoEmpresa}
                  onChange={e => setForm(s => ({ ...s, correoEmpresa: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="contacto@miempresa.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Teléfono empresa">
                <input
                  value={form.telefonoEmpresa}
                  onChange={e => setForm(s => ({ ...s, telefonoEmpresa: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="2222-0000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="WhatsApp (número sin guión)">
                <input
                  value={form.numeroWhatsapp}
                  onChange={e => setForm(s => ({ ...s, numeroWhatsapp: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="50688880000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
            </div>
          </Section>

          <Section title="Identidad visual">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Color primario">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorPrimario}
                    onChange={e => setForm(s => ({ ...s, colorPrimario: e.target.value }))}
                    disabled={!canEdit}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
                  />
                  <input
                    value={form.colorPrimario}
                    onChange={e => setForm(s => ({ ...s, colorPrimario: e.target.value }))}
                    disabled={!canEdit}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none disabled:opacity-60"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </div>
              </Field>
              <Field label="Color secundario">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorSecundario}
                    onChange={e => setForm(s => ({ ...s, colorSecundario: e.target.value }))}
                    disabled={!canEdit}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
                  />
                  <input
                    value={form.colorSecundario}
                    onChange={e => setForm(s => ({ ...s, colorSecundario: e.target.value }))}
                    disabled={!canEdit}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none disabled:opacity-60"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </div>
              </Field>
            </div>
            <Field label="Logo de la empresa">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleLogoFile(e.target.files?.[0])}
              />
              {form.logoUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                    style={{ border: '1px solid var(--hc-border)' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Logo actual</p>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                        >
                          {uploading ? 'Subiendo…' : 'Cambiar logo'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(s => ({ ...s, logoUrl: '' }))}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: '#ef4444', backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : canEdit ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className="cursor-pointer rounded-xl p-6 text-center transition-colors"
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                    backgroundColor: dragOver ? 'var(--hc-accent)/5' : 'var(--hc-surface-2)',
                  }}
                >
                  {uploading ? (
                    <p className="text-sm font-medium" style={{ color: 'var(--hc-accent)' }}>Subiendo imagen…</p>
                  ) : (
                    <>
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--hc-muted)' }}>
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Subir logo</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
                        Arrastrá o hacé clic · PNG, JPG, SVG · máx. 10 MB
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin logo configurado</p>
              )}
            </Field>
          </Section>

          {/* Galería de fotos para galería de emprendedores */}
          <Section title="Galería de fotos">
            <p className="text-xs mb-3" style={{ color: 'var(--hc-muted)' }}>
              Estas fotos se mostrarán en la galería de emprendedores de HOTCLICK. Máximo 8 imágenes.
            </p>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFotoFile(e.target.files?.[0])}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fotos.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden aspect-square"
                  style={{ border: '1px solid var(--hc-border)' }}>
                  <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {canEdit && fotos.length < 8 && (
                <button
                  type="button"
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="rounded-xl aspect-square flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  style={{ border: '2px dashed var(--hc-border)', backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                >
                  {uploadingFoto ? (
                    <span className="text-xs">Subiendo…</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      <span className="text-xs font-medium">Agregar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </Section>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </form>
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
