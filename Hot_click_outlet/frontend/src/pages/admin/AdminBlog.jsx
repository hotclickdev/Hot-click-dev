import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const empty = { titulo: '', resumen: '', contenido: '', imagenUrl: '', publicado: false }

function Modal({ entrada, onSave, onClose }) {
  const [form, setForm] = useState(entrada ?? empty)
  const [saving, setSaving] = useState(false)
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

  const INPUT = {
    width: '100%', padding: '9px 12px', borderRadius: 9, boxSizing: 'border-box',
    border: '1.5px solid var(--hc-border)', background: 'var(--hc-surface-2)',
    color: 'var(--hc-text)', fontSize: 13,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--hc-surface)', borderRadius: 16, padding: 28,
          width: '100%', maxWidth: 640, boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--hc-text)', marginTop: 0, marginBottom: 20 }}>
          {entrada ? 'Editar entrada' : 'Nueva entrada del blog'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Título *</label>
            <input style={INPUT} value={form.titulo} onChange={set('titulo')} placeholder="Título del artículo" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Resumen</label>
            <textarea style={{ ...INPUT, height: 70, resize: 'vertical' }} value={form.resumen ?? ''} onChange={set('resumen')} placeholder="Breve descripción (aparece en listado)..." />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Contenido</label>
            <textarea style={{ ...INPUT, height: 200, resize: 'vertical' }} value={form.contenido ?? ''} onChange={set('contenido')} placeholder="Contenido completo del artículo..." />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>URL de imagen de portada</label>
            <input style={INPUT} value={form.imagenUrl ?? ''} onChange={set('imagenUrl')} placeholder="https://..." />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!form.publicado} onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'var(--hc-text)' }}>Publicar (visible en el blog)</span>
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: 'var(--hc-surface-2)', color: 'var(--hc-text)',
              border: '1.5px solid var(--hc-border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '10px 0', borderRadius: 9,
              background: 'var(--hc-accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Guardando...' : form.publicado ? 'Guardar y publicar' : 'Guardar borrador'}
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
      const r = await api.get('/blog')
      setLista(r.data?.data ?? [])
    } catch { showToast('Error cargando blog', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLista() }, []) // eslint-disable-line

  async function handleSave(form) {
    if (form.id) {
      await api.put(`/blog/${form.id}`, form)
      showToast('Actualizado', 'success')
    } else {
      await api.post('/blog', form)
      showToast('Entrada creada', 'success')
    }
    fetchLista()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta entrada?')) return
    await api.delete(`/blog/${id}`)
    showToast('Eliminada', 'success')
    setLista(prev => prev.filter(e => e.id !== id))
  }

  async function togglePublicado(e) {
    try {
      await api.put(`/blog/${e.id}`, { ...e, publicado: !e.publicado })
      setLista(prev => prev.map(x => x.id === e.id ? { ...x, publicado: !x.publicado } : x))
      showToast(!e.publicado ? 'Publicado' : 'Movido a borrador', 'success')
    } catch { showToast('Error', 'error') }
  }

  const publicados = lista.filter(e => e.publicado).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Blog</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {publicados} publicado{publicados !== 1 ? 's' : ''} · {lista.length - publicados} borrador{lista.length - publicados !== 1 ? 'es' : ''}
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

      {loading ? (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--hc-muted)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📝</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Sin entradas aún</p>
        </div>
      ) : (
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
