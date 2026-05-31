import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useBlocker } from 'react-router-dom'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'

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

const MAX_FOTOS = 10

export default function AdminMiEmpresa() {
  const toast = useToast()
  const userRole = useAuthStore(s => s.userRole)
  const [empresa, setEmpresa]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const savedFormRef = useRef(null)
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
      // El interceptor de Axios ya hace unwrap de ResponseDTO → data ES la empresa directamente
      const e = data?.id ? data : (data?.data ?? data)
      if (!e?.id) { toast({ message: 'No se encontró el negocio', type: 'error' }); return }
      setEmpresa(e)
      const descRaw = e.descripcion ?? ''
      // Separar fotos de la descripción visible
      const descVisible = descRaw.replace(/\[FOTOS\].*?(\[\/FOTOS\]|$)/s, '').trim()
      const initialForm = {
        nombreComercial:  e.nombreComercial  ?? '',
        descripcion:      descVisible,
        telefonoEmpresa:  e.telefonoEmpresa  ?? '',
        correoEmpresa:    e.correoEmpresa    ?? '',
        numeroWhatsapp:   e.numeroWhatsapp   ?? '',
        colorPrimario:    e.colorPrimario    ?? '#FF4B12',
        colorSecundario:  e.colorSecundario  ?? '#1A1A2E',
        logoUrl:          e.logoUrl          ?? '',
      }
      setForm(initialForm)
      savedFormRef.current = initialForm
      // Extraer fotos guardadas en descripcion como JSON
      try {
        const match = descRaw.match(/\[FOTOS\](.*?)(\[\/FOTOS\]|$)/s)
        if (match) setFotos(JSON.parse(match[1]))
        else setFotos([])
      } catch { setFotos([]) }
    } catch {
      toast({ message: 'Error al cargar perfil del negocio', type: 'error' })
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
      toast({ message: 'Logo subido correctamente', type: 'success' })
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al subir el logo', type: 'error' })
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
    if (form.descripcion.includes('[FOTOS]') || form.descripcion.includes('[/FOTOS]')) {
      e.descripcion = 'La descripción no puede contener el texto "[FOTOS]" — usá la sección Galería para subir fotos'
    }
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
      savedFormRef.current = { ...form }
      toast({ message: 'Perfil del negocio actualizado', type: 'success' })
      cargar()
    } catch {
      toast({ message: 'Error al guardar cambios', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleFotoFile = useCallback(async (file) => {
    if (!file) return
    if (fotos.length >= MAX_FOTOS) { toast({ message: `Máximo ${MAX_FOTOS} fotos permitidas`, type: 'error' }); return }
    setUploadingFoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/empresa/perfil/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = data?.data ?? data
      const nuevasFotos = [...fotos, url]
      setFotos(nuevasFotos)

      // Auto-guardar la descripción con las nuevas fotos
      const descClean = form.descripcion.trim().replace(/\[FOTOS\].*?(\[\/FOTOS\]|$)/s, '').trim()
      await api.put('/empresa/perfil', {
        nombreComercial: form.nombreComercial || empresa?.nombreComercial || '',
        descripcion: descClean + `\n[FOTOS]${JSON.stringify(nuevasFotos)}[/FOTOS]`,
        telefonoEmpresa: form.telefonoEmpresa,
        correoEmpresa:   form.correoEmpresa,
        numeroWhatsapp:  form.numeroWhatsapp,
        colorPrimario:   form.colorPrimario,
        colorSecundario: form.colorSecundario,
      })
      toast({ message: 'Foto agregada y guardada', type: 'success' })
    } catch {
      toast({ message: 'Error al subir la foto', type: 'error' })
    } finally {
      setUploadingFoto(false)
    }
  }, [fotos, form, empresa])

  const isDirty = useMemo(() => {
    if (!savedFormRef.current) return false
    const fields = ['nombreComercial','descripcion','telefonoEmpresa','correoEmpresa','numeroWhatsapp','colorPrimario','colorSecundario','logoUrl']
    return fields.some(k => form[k] !== savedFormRef.current[k])
  }, [form])

  // Bloquear recarga de página con cambios sin guardar
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Bloquear navegación in-app con cambios sin guardar
  const blocker = useBlocker(isDirty && !saving)

  const canEdit = userRole === 'EMPRENDEDOR' || userRole === 'ADMIN_IT'

  if (loading) {
    return (
      <>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</div>
      </>
    )
  }

  if (!empresa) {
    return (
      <>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>No se encontró el negocio asociado a tu cuenta.</div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi negocio</h1>
            {isDirty && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                Cambios sin guardar
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Completá el perfil que verán tus clientes en la plataforma</p>
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
              Tu negocio está pendiente de aprobación por el equipo de HOTCLICK. Te notificaremos por correo cuando sea aprobado.
            </div>
          )}
        </div>

        {/* ── Completitud del perfil ── */}
        {canEdit && (() => {
          const checks = [
            { label: 'Logo',        done: !!form.logoUrl },
            { label: 'Descripción', done: form.descripcion.trim().length > 10 },
            { label: 'Teléfono',    done: !!form.telefonoEmpresa.trim() },
            { label: 'Correo',      done: !!form.correoEmpresa.trim() },
            { label: 'WhatsApp',    done: !!form.numeroWhatsapp.trim() },
          ]
          const done = checks.filter(c => c.done).length
          const pct = Math.round((done / checks.length) * 100)
          if (pct === 100) return null
          return (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                  Perfil {pct}% completado
                </span>
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{done}/{checks.length}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: pct < 60 ? '#f59e0b' : 'var(--hc-accent)' }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {checks.map(c => (
                  <span key={c.label} className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: c.done ? 'rgba(34,197,94,0.1)' : 'var(--hc-surface-2)',
                      color: c.done ? '#22c55e' : 'var(--hc-muted)',
                      border: `1px solid ${c.done ? 'rgba(34,197,94,0.2)' : 'var(--hc-border)'}`,
                    }}>
                    {c.done ? '✓ ' : ''}{c.label}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Visibilidad pública ── */}
        {empresa.estadoEmpresa === 'ACTIVO' && (
          <VisibilidadCard
            visible={empresa.visibilidadPublica !== false}
            onChange={async (val) => {
              try {
                const { data } = await api.put('/empresa/perfil/visibilidad', { visibilidadPublica: val })
                const updated = data?.id ? data : (data?.data ?? data)
                setEmpresa(e => ({ ...e, visibilidadPublica: val }))
                toast({ message: val ? 'Negocio visible al público' : 'Negocio en modo invisible', type: 'success' })
                // Refrescar el estado global del layout
                if (updated) setEmpresa(e => ({ ...e, ...updated }))
              } catch (err) {
                toast({ message: err?.response?.data?.message ?? 'Error al cambiar visibilidad', type: 'error' })
              }
            }}
          />
        )}

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
            <Field label="Descripción" error={errors.descripcion}>
              <textarea
                value={form.descripcion}
                onChange={e => setForm(s => ({ ...s, descripcion: e.target.value }))}
                rows={3}
                disabled={!canEdit}
                placeholder="Describe brevemente tu negocio y lo que ofrecés…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-60"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.descripcion ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
              />
            </Field>
          </Section>

          <Section title="Contacto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Correo del negocio">
                <input
                  type="email"
                  value={form.correoEmpresa}
                  onChange={e => setForm(s => ({ ...s, correoEmpresa: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="contacto@minegocio.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Teléfono del negocio">
                <input
                  value={form.telefonoEmpresa}
                  onChange={e => setForm(s => ({ ...s, telefonoEmpresa: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="2222-0000"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="WhatsApp" hint="Formato: 50688880000 (código país + número)">
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
            <Field label="Logo del negocio">
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
              Estas fotos se mostrarán en la galería de emprendedores de HOTCLICK. Máximo 10 imágenes.
              Las fotos se guardan automáticamente al subirlas.
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
                      onClick={async () => {
                        const nuevasFotos = fotos.filter((_, j) => j !== i)
                        setFotos(nuevasFotos)
                        const descClean = form.descripcion.trim().replace(/\[FOTOS\].*?(\[\/FOTOS\]|$)/s, '').trim()
                        try {
                          await api.put('/empresa/perfil', {
                            nombreComercial: form.nombreComercial || empresa?.nombreComercial || '',
                            descripcion: descClean + (nuevasFotos.length ? `\n[FOTOS]${JSON.stringify(nuevasFotos)}[/FOTOS]` : ''),
                            telefonoEmpresa: form.telefonoEmpresa, correoEmpresa: form.correoEmpresa,
                            numeroWhatsapp: form.numeroWhatsapp, colorPrimario: form.colorPrimario, colorSecundario: form.colorSecundario,
                          })
                          toast({ message: 'Foto eliminada', type: 'success' })
                        } catch { toast({ message: 'Error al eliminar foto', type: 'error' }) }
                      }}
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
              {canEdit && fotos.length < MAX_FOTOS && (
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

      {/* Modal: confirmar navegación con cambios sin guardar */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div>
              <p className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>Cambios sin guardar</p>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
                Tenés cambios sin guardar en el perfil de tu negocio. ¿Salir sin guardar?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => blocker.proceed?.()}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => blocker.reset?.()}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
              >
                Volver a guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function VisibilidadCard({ visible, onChange }) {
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try { await onChange(!visible) } finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${visible ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: visible ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)' }}>
          {visible
            ? <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            : <svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
          }
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
            Visibilidad pública
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {visible
              ? 'Tu tienda y productos son visibles al público'
              : 'Tu tienda está oculta — el público no puede ver tus productos'}
          </p>
        </div>
      </div>

      <button
        onClick={toggle}
        disabled={loading}
        className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 shrink-0"
        style={{ backgroundColor: visible ? '#22c55e' : '#6366f1' }}
        role="switch"
        aria-checked={visible}
      >
        {loading
          ? <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </span>
          : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${visible ? 'translate-x-6' : 'translate-x-1'}`} />
        }
      </button>
    </div>
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

function Field({ label, error, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px]" style={{ color: 'var(--hc-muted)', opacity: 0.7 }}>{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
