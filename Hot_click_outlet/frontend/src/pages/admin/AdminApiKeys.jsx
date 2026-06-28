import { useState, useEffect, useRef } from 'react'
import api from '@/services/api'

const fmt = (ts) => ts ? ts.slice(0, 16).replace('T', ' ') : '—'

function KeyRevealModal({ keyData, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const inputRef = useRef(null)

  function copiar() {
    navigator.clipboard.writeText(keyData.plaintextKey).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="rounded-2xl p-6 max-w-lg w-full space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '2px solid rgba(239,68,68,0.5)' }}>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--hc-text)' }}>Guarda esta clave ahora</p>
            <p className="text-sm mt-1 text-red-400">
              Esta es la ÚNICA vez que se muestra. No se puede recuperar después.
            </p>
          </div>
        </div>

        <div className="rounded-xl p-3 font-mono text-sm break-all select-all"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          {keyData.plaintextKey}
        </div>

        <div className="flex gap-3">
          <button onClick={copiar}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: copiado ? 'rgba(16,185,129,0.15)' : 'var(--hc-accent)',
              color: copiado ? '#10b981' : '#fff',
              border: copiado ? '1px solid rgba(16,185,129,0.4)' : 'none',
            }}>
            {copiado ? '✓ Copiada' : 'Copiar clave'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            Cerrar (ya la guardé)
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--hc-muted)' }}>
          Usa esta clave con <code>Authorization: Bearer {keyData.plaintextKey?.slice(0, 16)}...</code>
        </p>
      </div>
    </div>
  )
}

export default function AdminApiKeys() {
  const [keys, setKeys]           = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)
  const [creando, setCreando]     = useState(false)
  const [form, setForm]           = useState({ nombre: '', entorno: 'live' })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [keyReveal, setKeyReveal] = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/api-keys')
      setKeys(Array.isArray(data) ? data : [])
    } catch { setError('No se pudieron cargar las API keys') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  async function crear(e) {
    e.preventDefault()
    setCreando(true); setError(null)
    try {
      const { data } = await api.post('/admin/api-keys', form)
      setKeyReveal(data)
      setForm({ nombre: '', entorno: 'live' })
      setMostrarForm(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear la clave')
    } finally { setCreando(false) }
  }

  async function revocar(key) {
    if (!confirm(`¿Revocar "${key.nombre}"? Las apps que la usen dejarán de funcionar.`)) return
    try { await api.delete(`/admin/api-keys/${key.id}`); await cargar() }
    catch { setError('Error al revocar') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>API Keys</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Acceso programático a la API de HotClick para apps externas
          </p>
        </div>
        <button onClick={() => setMostrarForm(v => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          + Nueva clave
        </button>
      </div>

      {/* Doc rápida */}
      <div className="rounded-2xl p-4 space-y-2"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Uso básico</p>
        <pre className="text-xs overflow-x-auto" style={{ color: 'var(--hc-text)' }}>{`curl https://tu-dominio.com/api/productos \\
  -H "Authorization: Bearer hck_live_XXXXXXXXXX..."`}</pre>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Las claves <code>hck_live_...</code> acceden a producción.
          Las <code>hck_test_...</code> devuelven los mismos datos pero se marcan como pruebas en los logs.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={crear} className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nueva API key</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="api-nombre" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre (para identificarla) *</label>
              <input id="api-nombre" required value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Mi aplicación móvil"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div className="space-y-1">
              <label htmlFor="api-entorno" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Entorno</label>
              <select id="api-entorno" value={form.entorno} onChange={e => setForm(p => ({ ...p, entorno: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                <option value="live">live (producción)</option>
                <option value="test">test (desarrollo)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creando}
              className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {creando ? 'Generando…' : 'Generar clave'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--hc-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="text-4xl mb-3">🔑</div>
          <p className="font-medium">Sin API keys</p>
          <p className="text-sm mt-1">Crea una clave para dar acceso programático a la API</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                {['Nombre', 'Prefijo', 'Entorno', 'Estado', 'Último uso', 'Creada', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', opacity: k.activo ? 1 : 0.5 }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--hc-text)' }}>{k.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{k.prefijo}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.entorno === 'live' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                      {k.entorno}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.activo ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {k.activo ? 'Activa' : 'Revocada'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmt(k.ultimoUso)}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmt(k.fechaCreacion)}</td>
                  <td className="px-4 py-3">
                    {k.activo && (
                      <button onClick={() => revocar(k)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                        style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {keyReveal && <KeyRevealModal keyData={keyReveal} onClose={() => setKeyReveal(null)} />}
    </div>
  )
}
