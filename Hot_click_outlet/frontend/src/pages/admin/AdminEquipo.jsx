import { useState, useEffect } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import PhoneField from '@/components/ui/PhoneField'

const ESTADO_LABEL = { 1: 'Activo', 2: 'Inactivo', 3: 'Eliminado', 4: 'Suspendido', 5: 'Pendiente' }
const ESTADO_COLOR = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
  5: 'bg-blue-500/15 text-blue-400',
}

const ROL_CONFIG = {
  PROPIETARIO: { label: 'Propietario', color: 'bg-amber-500/15 text-amber-400', desc: 'Control total' },
  ADMIN:       { label: 'Admin',       color: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]', desc: 'Acceso completo' },
  EDITOR:      { label: 'Editor',      color: 'bg-blue-500/15 text-blue-400',     desc: 'Edita productos y pedidos' },
  LECTOR:      { label: 'Lector',      color: 'bg-gray-500/15 text-gray-400',     desc: 'Solo lectura' },
}
const ROLES_ASIGNABLES = ['EDITOR', 'LECTOR']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminEquipo() {
  const toast = useToast()
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ nombre: '', correo: '', password: '', telefono: '', rolEnEmpresa: 'EDITOR' })
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [showPwd, setShowPwd]   = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await api.get('/empresa/equipo')
      setMiembros(data.data ?? [])
    } catch {
      toast({ message: 'Error al cargar el equipo', type: 'error' })
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
        nombre:       form.nombre.trim(),
        correo:       form.correo.trim(),
        password:     form.password,
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        rolEnEmpresa: form.rolEnEmpresa,
      })
      toast({ message: `Miembro agregado como ${ROL_CONFIG[form.rolEnEmpresa]?.label ?? form.rolEnEmpresa}`, type: 'success' })
      setForm({ nombre: '', correo: '', password: '', telefono: '', rolEnEmpresa: 'EDITOR' })
      setErrors({})
      setShowForm(false)
      cargar()
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al agregar miembro', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarRol(id, rolEnEmpresa) {
    setSaving(true)
    try {
      await api.put(`/empresa/equipo/${id}/rol`, { rolEnEmpresa })
      toast({ message: `Rol actualizado a ${ROL_CONFIG[rolEnEmpresa]?.label ?? rolEnEmpresa}`, type: 'success' })
      setMiembros(prev => prev.map(m => m.id === id ? { ...m, rolEnEmpresa } : m))
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al cambiar rol', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id) {
    setSaving(true)
    try {
      await api.delete(`/empresa/equipo/${id}`)
      toast({ message: 'Miembro eliminado del equipo', type: 'success' })
      setConfirmId(null)
      cargar()
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al eliminar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const activos = miembros.filter(m => m.estado === 1 || m.estado === 2)

  return (
    <>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi equipo</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              Personas que pueden gestionar tu negocio junto a vos
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
            <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nuevo miembro</h2>

            {/* Selector de rol destacado */}
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: 'var(--hc-muted)' }}>Rol en el negocio</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES_ASIGNABLES.map(r => {
                  const cfg = ROL_CONFIG[r]
                  const active = form.rolEnEmpresa === r
                  return (
                    <button key={r} type="button" onClick={() => setForm(s => ({ ...s, rolEnEmpresa: r }))}
                      className="flex flex-col gap-0.5 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        border: `2px solid ${active ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                        backgroundColor: active ? 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' : 'var(--hc-surface-2)',
                      }}>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{cfg.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

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
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.correo ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                />
              </Field>
              <Field label="Contraseña de acceso" error={errors.password}>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 pr-9 rounded-xl text-sm outline-none font-mono"
                      style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${errors.password ? '#ef4444' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-70"
                      style={{ color: 'var(--hc-muted)' }}
                      title={showPwd ? 'Ocultar' : 'Mostrar'}
                    >
                      {showPwd
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = generatePassword()
                      setForm(s => ({ ...s, password: pwd }))
                      setShowPwd(true)
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-accent)' }}
                    title="Generar contraseña segura automáticamente"
                  >
                    Generar
                  </button>
                </div>
              </Field>
              <Field label="Teléfono (opcional)">
                <PhoneField
                  value={form.telefono}
                  onChange={(val) => setForm(s => ({ ...s, telefono: val }))}
                  hint="Opcional"
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
          ) : activos.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--hc-muted)' }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Sin miembros en el equipo</p>
              <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                Agregá colaboradores para que puedan gestionar productos, pedidos y configuración junto a vos.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
              >
                + Agregar primer miembro
              </button>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
                  {['Nombre', 'Correo', 'Rol', 'Estado', 'Se unió', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activos.map(m => (
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
                      {m.rolEnEmpresa === 'PROPIETARIO' ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROL_CONFIG['PROPIETARIO'].color}`}>
                          {ROL_CONFIG['PROPIETARIO'].label}
                        </span>
                      ) : (
                        <select
                          value={m.rolEnEmpresa ?? 'EDITOR'}
                          onChange={e => cambiarRol(m.id, e.target.value)}
                          disabled={saving}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer disabled:opacity-50 ${ROL_CONFIG[m.rolEnEmpresa]?.color ?? 'bg-gray-500/15 text-gray-400'}`}
                          style={{ backgroundColor: 'transparent' }}
                        >
                          {ROLES_ASIGNABLES.map(r => (
                            <option key={r} value={r} style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}>
                              {ROL_CONFIG[r].label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[m.estado] ?? ''}`}>
                        {ESTADO_LABEL[m.estado] ?? m.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmtDate(m.fechaIngreso)}</td>
                    <td className="px-4 py-3">
                      {m.rolEnEmpresa !== 'PROPIETARIO' && (
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
            </div>
            </div>
          )}
        </div>

        <div className="rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
          <span><strong style={{ color: 'var(--hc-text)' }}>Editor</strong> — edita productos y pedidos</span>
          <span><strong style={{ color: 'var(--hc-text)' }}>Lector</strong> — solo visualiza, sin cambios</span>
        </div>
      </div>

    </>
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
