import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import api from '@/services/api'

const ESTADO_LABEL = { 1: 'Activo', 2: 'Inactivo', 3: 'Eliminado', 4: 'Suspendido', 5: 'Pendiente' }
const ESTADO_COLOR = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
  5: 'bg-blue-500/15 text-blue-400',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminEquipo() {
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ nombre: '', correo: '', password: '', telefono: '' })
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await api.get('/empresa/equipo')
      setMiembros(data.data ?? [])
    } catch {
      showToast('Error al cargar el equipo', 'error')
    } finally {
      setLoading(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido'
    if (!form.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Correo inválido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  async function invitar(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await api.post('/empresa/equipo', {
        nombre:   form.nombre.trim(),
        correo:   form.correo.trim(),
        password: form.password,
        telefono: form.telefono.trim() || '00000000',
      })
      showToast('Miembro agregado al equipo')
      setForm({ nombre: '', correo: '', password: '', telefono: '' })
      setErrors({})
      setShowForm(false)
      cargar()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error al agregar miembro', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id) {
    setSaving(true)
    try {
      await api.delete(`/empresa/equipo/${id}`)
      showToast('Miembro eliminado')
      setConfirmId(null)
      cargar()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Error al eliminar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const activos = miembros.filter(m => m.estado === 1 || m.estado === 2)

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi equipo</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              Gestiona los administradores de tu empresa
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            {showForm ? 'Cancelar' : '+ Agregar miembro'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <form onSubmit={invitar} className="rounded-xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nuevo miembro (ADMIN_CLIENTE)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo" error={errors.nombre}>
                <input
                  value={form.nombre}
                  onChange={e => setForm(s => ({ ...s, nombre: e.target.value }))}
                  placeholder="Ej: María González"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.nombre ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Correo electrónico" error={errors.correo}>
                <input
                  type="email"
                  value={form.correo}
                  onChange={e => setForm(s => ({ ...s, correo: e.target.value }))}
                  placeholder="admin@empresa.com"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.correo ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Contraseña temporal" error={errors.password}>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.password ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Teléfono (opcional)">
                <input
                  value={form.telefono}
                  onChange={e => setForm(s => ({ ...s, telefono: e.target.value }))}
                  placeholder="8888-0000"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setErrors({}) }}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ color: 'var(--hc-muted)' }}
              >Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
              >{saving ? 'Guardando…' : 'Agregar miembro'}</button>
            </div>
          </form>
        )}

        {/* Lista */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando equipo…</div>
          ) : miembros.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Aún no tienes miembros en el equipo.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Agrega administradores para compartir la gestión.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
                  {['Nombre', 'Correo', 'Rol', 'Estado', 'Acceso', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {miembros.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
                    className="hover:bg-[var(--hc-surface-2)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff] shrink-0">
                          {m.nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ color: 'var(--hc-text)' }}>{m.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{m.correo}</td>
                    <td className="px-4 py-3">
                      {m.roles?.map(r => (
                        <span key={r.nombreRol} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium">
                          {r.nombreRol}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[m.estado] ?? ''}`}>
                        {ESTADO_LABEL[m.estado] ?? m.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmtDate(m.fechaUltimoAcceso)}</td>
                    <td className="px-4 py-3">
                      {m.roles?.every(r => r.nombreRol !== 'EMPRENDEDOR') && (
                        confirmId === m.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => eliminar(m.id)} disabled={saving}
                              className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-50">
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmId(null)}
                              className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--hc-muted)' }}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmId(m.id)}
                            className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                            Eliminar
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Los miembros con rol <strong>ADMIN_CLIENTE</strong> tienen acceso al panel de administración de tu empresa pero no pueden agregar ni eliminar otros miembros.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
