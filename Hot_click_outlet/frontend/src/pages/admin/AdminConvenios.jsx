import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { convenioService } from '@/services/convenioService'
import { useToast } from '@/components/ui/Toast'

const empty = { nombre: '', descripcion: '', logoUrl: '', urlWeb: '', activo: true }

function Modal({ convenio, onSave, onClose }) {
  const [form, setForm] = useState(convenio ?? empty)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!form.nombre.trim()) return showToast('El nombre es requerido', 'warning')
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
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--hc-surface)', borderRadius: 16, padding: 28,
          width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--hc-text)', marginTop: 0, marginBottom: 20 }}>
          {convenio ? 'Editar emprendimiento' : 'Nuevo emprendimiento'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="conv-nombre" style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Nombre *</label>
            <input id="conv-nombre" style={INPUT} value={form.nombre} onChange={set('nombre')} placeholder="Nombre del emprendimiento" />
          </div>
          <div>
            <label htmlFor="conv-descripcion" style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Descripción</label>
            <textarea id="conv-descripcion" style={{ ...INPUT, height: 80, resize: 'vertical' }} value={form.descripcion ?? ''} onChange={set('descripcion')} placeholder="Breve descripción del convenio..." />
          </div>
          <div>
            <label htmlFor="conv-logo" style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>URL del logo</label>
            <input id="conv-logo" style={INPUT} value={form.logoUrl ?? ''} onChange={set('logoUrl')} placeholder="https://..." />
          </div>
          <div>
            <label htmlFor="conv-web" style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 5 }}>Sitio web</label>
            <input id="conv-web" style={INPUT} value={form.urlWeb ?? ''} onChange={set('urlWeb')} placeholder="https://..." />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
            <span style={{ fontSize: 13, color: 'var(--hc-text)' }}>Activo (visible en el sitio)</span>
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: 'var(--hc-surface-2)', color: 'var(--hc-text)',
              border: '1.5px solid var(--hc-border)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              background: 'var(--hc-accent)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AdminConvenios() {
  const { showToast } = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | convenio obj

  async function fetchLista() {
    try {
      const r = await convenioService.getAll()
      setLista(r.data?.data ?? [])
    } catch { showToast('Error cargando convenios', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLista() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga al montar

  async function handleSave(form) {
    if (form.id) {
      await convenioService.update(form.id, form)
      showToast('Actualizado', 'success')
    } else {
      await convenioService.create(form)
      showToast('Creado', 'success')
    }
    fetchLista()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este emprendimiento?')) return
    await convenioService.delete(id)
    showToast('Eliminado', 'success')
    setLista(prev => prev.filter(c => c.id !== id))
  }

  async function handleToggle(c) {
    await convenioService.update(c.id, { ...c, activo: !c.activo })
    setLista(prev => prev.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x))
    showToast(!c.activo ? 'Activado' : 'Desactivado', 'success')
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Emprendimientos con convenio</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            Negocios aliados que aparecen en el sitio público
          </p>
        </div>
        <button onClick={() => setModal('new')} style={{
          padding: '9px 18px', borderRadius: 10,
          background: 'var(--hc-accent)', color: 'white',
          border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + Nuevo
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 48 }}>Cargando...</p>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--hc-muted)' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🤝</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Sin emprendimientos aún</p>
          <p style={{ fontSize: 13 }}>Agregá el primer convenio</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map(c => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px',
                background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
                borderRadius: 12, flexWrap: 'wrap',
              }}
            >
              {c.logoUrl ? (
                <img src={c.logoUrl} alt={c.nombre} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', border: '1px solid var(--hc-border)', padding: 2, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--hc-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤝</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>{c.nombre}</p>
                {c.descripcion && <p style={{ fontSize: 12, color: 'var(--hc-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.descripcion}</p>}
                {c.urlWeb && <a href={c.urlWeb} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--hc-accent)', textDecoration: 'none' }}>{c.urlWeb}</a>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => handleToggle(c)} style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                  border: '1px solid', cursor: 'pointer',
                  background: c.activo ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)',
                  color: c.activo ? 'var(--hc-success)' : 'var(--hc-muted)',
                  borderColor: c.activo ? 'rgba(5,150,105,0.3)' : 'var(--hc-border)',
                }}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => setModal(c)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--hc-border)', background: 'var(--hc-surface)',
                  color: 'var(--hc-text)', cursor: 'pointer',
                }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(c.id)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)',
                  color: '#dc2626', cursor: 'pointer',
                }}>
                  Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <Modal
            convenio={modal === 'new' ? null : modal}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
