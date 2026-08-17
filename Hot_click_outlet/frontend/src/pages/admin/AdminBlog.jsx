import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { blogService } from '@/services/blogService'
import { useToast } from '@/components/ui/Toast'

const empty = { titulo: '', resumen: '', contenido: '', imagenUrl: '', publicado: false }

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
      color: 'var(--hc-accent)', margin: '0 0 12px',
    }}>{children}</p>
  )
}

function FieldLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)' }}>{children}</span>
      {count != null && <span style={{ fontSize: 10.5, color: 'var(--hc-muted)', opacity: 0.7 }}>{count}</span>}
    </div>
  )
}

function Modal({ entrada, onSave, onClose }) {
  const [form, setForm] = useState(entrada ?? empty)
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(null)
  const [imgError, setImgError] = useState(false)
  const { showToast } = useToast()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.titulo.trim()) return showToast('El título es requerido', 'warning')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch { showToast('Error al guardar', 'error') }
    finally { setSaving(false) }
  }

  const field = key => ({
    width: '100%', padding: '10px 13px', borderRadius: 10, boxSizing: 'border-box',
    border: `1.5px solid ${focused === key ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
    background: 'var(--hc-surface-2)', color: 'var(--hc-text)', fontSize: 13.5,
    outline: 'none', transition: 'border-color 0.15s ease',
    boxShadow: focused === key ? '0 0 0 3px color-mix(in srgb, var(--hc-accent) 18%, transparent)' : 'none',
  })
  const focusHandlers = key => ({ onFocus: () => setFocused(key), onBlur: () => setFocused(null) })
  const submitLabel = form.publicado ? 'Guardar y publicar' : 'Guardar borrador'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }} role="presentation" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--hc-surface)', borderRadius: 18, padding: 32,
          width: '100%', maxWidth: 720, boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>
          {entrada ? 'Editar entrada' : 'Nueva entrada del blog'}
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--hc-muted)', margin: '4px 0 22px' }}>
          Completá los datos y guardá como borrador o publicalo directo.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{
            padding: 18, borderRadius: 14, background: 'var(--hc-surface-2)',
            border: '1px solid var(--hc-border)', marginBottom: 16,
          }}>
            <SectionLabel>Contenido principal</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <FieldLabel>Título *</FieldLabel>
                <input id="blog-titulo" style={field('titulo')} {...focusHandlers('titulo')}
                  value={form.titulo} onChange={set('titulo')} placeholder="Título del artículo" />
              </div>
              <div>
                <FieldLabel count={`${(form.resumen ?? '').length}/160`}>Resumen</FieldLabel>
                <textarea id="blog-resumen" style={{ ...field('resumen'), height: 66, resize: 'vertical' }} {...focusHandlers('resumen')}
                  maxLength={160} value={form.resumen ?? ''} onChange={set('resumen')} placeholder="Breve descripción (aparece en listado)..." />
              </div>
              <div>
                <FieldLabel count={`${(form.contenido ?? '').trim().split(/\s+/).filter(Boolean).length} palabras`}>Contenido</FieldLabel>
                <textarea id="blog-contenido" style={{ ...field('contenido'), height: 220, resize: 'vertical', lineHeight: 1.6 }} {...focusHandlers('contenido')}
                  value={form.contenido ?? ''} onChange={set('contenido')} placeholder="Contenido completo del artículo..." />
              </div>
            </div>
          </div>

          <div style={{
            padding: 18, borderRadius: 14, background: 'var(--hc-surface-2)',
            border: '1px solid var(--hc-border)', marginBottom: 20,
          }}>
            <SectionLabel>Portada y publicación</SectionLabel>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 120, height: 84, borderRadius: 10, flexShrink: 0,
                border: '1.5px dashed var(--hc-border)', background: 'var(--hc-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {form.imagenUrl && !imgError ? (
                  <img src={form.imagenUrl} alt="Portada" onError={() => setImgError(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 10.5, color: 'var(--hc-muted)', textAlign: 'center', padding: '0 8px' }}>Sin imagen</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <FieldLabel>URL de imagen de portada</FieldLabel>
                <input id="blog-imagen" style={field('imagen')} {...focusHandlers('imagen')}
                  value={form.imagenUrl ?? ''}
                  onChange={e => { setImgError(false); set('imagenUrl')(e) }}
                  placeholder="https://..." />
              </div>
            </div>

            <label style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 16,
              padding: '12px 14px', borderRadius: 10, background: 'var(--hc-surface)',
              border: '1px solid var(--hc-border)',
            }}>
              <span style={{
                position: 'relative', width: 38, height: 22, borderRadius: 999, flexShrink: 0,
                background: form.publicado ? 'var(--hc-accent)' : 'var(--hc-border)', transition: 'background 0.15s ease',
              }}>
                <input type="checkbox" checked={!!form.publicado}
                  onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', margin: 0 }} />
                <span style={{
                  position: 'absolute', top: 2, left: form.publicado ? 18 : 2, width: 18, height: 18,
                  borderRadius: '50%', background: '#fff', transition: 'left 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--hc-text)' }}>
                  {form.publicado ? 'Publicado' : 'Borrador'}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--hc-muted)' }}>
                  {form.publicado ? 'Visible para todos en el blog' : 'Solo visible para el equipo admin'}
                </span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: 'var(--hc-surface-2)', color: 'var(--hc-text)',
              border: '1.5px solid var(--hc-border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              background: 'var(--hc-accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              boxShadow: '0 8px 20px color-mix(in srgb, var(--hc-accent) 35%, transparent)',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminBlog() {
  const { showToast } = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  async function fetchLista() {
    try {
      const r = await blogService.getAll()
      setLista(r.data?.data ?? [])
    } catch { showToast('Error cargando blog', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLista() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga al montar

  async function handleSave(form) {
    if (form.id) {
      await blogService.update(form.id, form)
      showToast('Actualizado', 'success')
    } else {
      await blogService.create(form)
      showToast('Entrada creada', 'success')
    }
    fetchLista()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta entrada?')) return
    await blogService.delete(id)
    showToast('Eliminada', 'success')
    setLista(prev => prev.filter(e => e.id !== id))
  }

  async function togglePublicado(e) {
    try {
      await blogService.update(e.id, { ...e, publicado: !e.publicado })
      setLista(prev => prev.map(x => x.id === e.id ? { ...x, publicado: !x.publicado } : x))
      showToast(e.publicado ? 'Movido a borrador' : 'Publicado', 'success')
    } catch { showToast('Error', 'error') }
  }

  const publicados = lista.filter(e => e.publicado).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Blog</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {publicados} publicado{publicados === 1 ? '' : 's'} · {lista.length - publicados} borrador{lista.length - publicados === 1 ? '' : 'es'}
          </p>
        </div>
        <button onClick={() => setModal('new')} style={{
          padding: '9px 18px', borderRadius: 10,
          background: 'var(--hc-accent)', color: 'white',
          border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + Nueva entrada
        </button>
      </div>

      {loading && (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
      )}
      {!loading && lista.length === 0 && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--hc-muted)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📝</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Sin entradas aún</p>
        </div>
      )}
      {!loading && lista.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map(e => (
            <motion.div key={e.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
                borderRadius: 12, flexWrap: 'wrap',
              }}
            >
              {e.imagenUrl && (
                <img src={e.imagenUrl} alt={e.titulo} style={{ width: 56, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.titulo}
                </p>
                <p style={{ fontSize: 11, color: 'var(--hc-muted)', margin: '2px 0 0' }}>
                  {fmtDate(e.publicado ? e.fechaPublicacion : e.fechaCreacion)}
                  {e.resumen && <span> · {e.resumen.substring(0, 60)}{e.resumen.length > 60 ? '...' : ''}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: e.publicado ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
                  color: e.publicado ? 'var(--hc-success)' : 'var(--hc-warning)',
                  border: `1px solid ${e.publicado ? 'rgba(5,150,105,0.3)' : 'rgba(245,158,11,0.3)'}`,
                }}>
                  {e.publicado ? 'Publicado' : 'Borrador'}
                </span>
                <button onClick={() => togglePublicado(e)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: '1px solid var(--hc-border)', background: 'var(--hc-surface)',
                  color: 'var(--hc-text-2)', cursor: 'pointer',
                }}>
                  {e.publicado ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => setModal(e)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--hc-border)', background: 'var(--hc-surface)',
                  color: 'var(--hc-text)', cursor: 'pointer',
                }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(e.id)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12,
                  border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)',
                  color: '#dc2626', cursor: 'pointer',
                }}>
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <Modal
            entrada={modal === 'new' ? null : modal}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
