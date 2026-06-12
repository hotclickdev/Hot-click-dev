import { useState, useEffect } from 'react'
import api from '@/services/api'

const EVENTOS_DISPONIBLES = [
  { id: 'pedido.creado',    label: 'Pedido creado' },
  { id: 'pedido.pagado',    label: 'Pedido pagado' },
  { id: 'pedido.entregado', label: 'Pedido entregado' },
  { id: 'pedido.cancelado', label: 'Pedido cancelado' },
  { id: 'gift_card.canjeada', label: 'Gift card canjeada' },
  { id: 'plugin.test',     label: 'Test (siempre se envía)' },
]

const ESTADO_STYLE = {
  ENVIADO:  'text-green-400 bg-green-400/10',
  FALLIDO:  'text-red-400 bg-red-400/10',
  PENDIENTE: 'text-amber-400 bg-amber-400/10',
}

function EventosCheckbox({ value, onChange }) {
  const sel = (() => { try { return JSON.parse(value || '[]') } catch { return [] } })()
  function toggle(id) {
    const next = sel.includes(id) ? sel.filter(e => e !== id) : [...sel, id]
    onChange(JSON.stringify(next))
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {EVENTOS_DISPONIBLES.map(ev => (
        <label key={ev.id} className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={sel.includes(ev.id)} onChange={() => toggle(ev.id)}
            className="accent-[var(--hc-accent)]" />
          <span style={{ color: 'var(--hc-text)' }}>{ev.label}</span>
        </label>
      ))}
    </div>
  )
}

function LogModal({ plugin, onClose }) {
  const [logs, setLogs] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get(`/admin/plugins/${plugin.id}/eventos`)
      .then(({ data }) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [plugin.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <h3 className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>
            Logs — {plugin.nombre}
          </h3>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--hc-muted)' }}>✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {cargando ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin eventos registrados</p>
          ) : logs.map(l => (
            <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl text-xs"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] ${ESTADO_STYLE[l.estado] ?? ''}`}>
                {l.estado}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>{l.evento}</p>
                {l.codigoRespuesta && <p style={{ color: 'var(--hc-muted)' }}>HTTP {l.codigoRespuesta}</p>}
                {l.mensajeError && <p className="text-red-400 truncate">{l.mensajeError}</p>}
              </div>
              <span className="shrink-0" style={{ color: 'var(--hc-muted)' }}>
                {l.fechaEnvio ? l.fechaEnvio.slice(0, 16).replace('T', ' ') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FORM_VACIO = { nombre: '', descripcion: '', tipo: 'WEBHOOK', url: '', eventosSuscritos: '[]', secretoHmac: '' }

export default function AdminPlugins() {
  const [plugins, setPlugins]       = useState([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando]     = useState(null) // plugin | null
  const [form, setForm]             = useState(FORM_VACIO)
  const [guardando, setGuardando]   = useState(false)
  const [logPlugin, setLogPlugin]   = useState(null)
  const [testOk, setTestOk]         = useState(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/plugins')
      setPlugins(Array.isArray(data) ? data : [])
    } catch { setError('No se pudieron cargar los plugins') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() { setForm(FORM_VACIO); setEditando(null); setMostrarForm(true) }
  function abrirEdicion(p) {
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', tipo: p.tipo,
      url: p.url, eventosSuscritos: p.eventosSuscritos || '[]', secretoHmac: '' })
    setEditando(p); setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setError(null)
    try {
      if (editando) {
        await api.put(`/admin/plugins/${editando.id}`, form)
      } else {
        await api.post('/admin/plugins', form)
      }
      setMostrarForm(false); setEditando(null)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally { setGuardando(false) }
  }

  async function desactivar(p) {
    if (!confirm(`¿Desactivar el plugin "${p.nombre}"?`)) return
    try { await api.delete(`/admin/plugins/${p.id}`); await cargar() }
    catch { setError('Error al desactivar') }
  }

  async function testWebhook(p) {
    setTestOk(null)
    try {
      await api.post(`/admin/plugins/${p.id}/test`)
      setTestOk(p.id)
      setTimeout(() => setTestOk(null), 3000)
    } catch { setError('Error al enviar test') }
  }

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }))
  const setStr = (k) => (e) => set(k)(e.target.value)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Plugins / Integraciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Conecta HotClick con servicios externos via Webhook o iframe embebido
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          + Nuevo plugin
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={guardar} className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-accent)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
            {editando ? `Editar: ${editando.nombre}` : 'Nuevo plugin'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre *</label>
              <input required value={form.nombre} onChange={setStr('nombre')} placeholder="Mi integración"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Tipo</label>
              <select value={form.tipo} onChange={setStr('tipo')}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                <option value="WEBHOOK">Webhook (HTTP POST)</option>
                <option value="IFRAME">Iframe (panel embebido)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {form.tipo === 'WEBHOOK' ? 'URL del endpoint *' : 'URL del iframe *'}
            </label>
            <input required value={form.url} onChange={setStr('url')}
              placeholder={form.tipo === 'WEBHOOK' ? 'https://mi-servicio.com/webhook' : 'https://app.servicio.com/embed?token=xxx'}
              className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          </div>

          {form.tipo === 'WEBHOOK' && (
            <>
              <div className="space-y-2">
                <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Eventos suscritos</label>
                <EventosCheckbox value={form.eventosSuscritos} onChange={set('eventosSuscritos')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Secreto HMAC (para verificar firma — dejar vacío para no firmar)
                </label>
                <input type="password" value={form.secretoHmac} onChange={setStr('secretoHmac')}
                  placeholder={editando?.tieneSecretoHmac ? '••••••• (mantener vacío para no cambiar)' : 'secreto-opcional'}
                  className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                  style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
                <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
                  Header enviado: <code>X-HotClick-Signature: sha256=&lt;hmac&gt;</code>
                </p>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Descripción (opcional)</label>
            <input value={form.descripcion} onChange={setStr('descripcion')} placeholder="Para qué sirve este plugin"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={guardando}
              className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--hc-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="text-4xl mb-3">🔌</div>
          <p className="font-medium">Sin plugins configurados</p>
          <p className="text-sm mt-1">Agrega un webhook o un iframe para conectar servicios externos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map(p => {
            const eventos = (() => { try { return JSON.parse(p.eventosSuscritos || '[]') } catch { return [] } })()
            return (
              <div key={p.id} className="rounded-2xl p-4"
                style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${p.activo ? 'var(--hc-border)' : 'rgba(156,163,175,0.2)'}`, opacity: p.activo ? 1 : 0.55 }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ backgroundColor: 'var(--hc-bg)' }}>
                    {p.tipo === 'WEBHOOK' ? '🪝' : '🖼️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                        {p.tipo}
                      </span>
                      {p.tieneSecretoHmac && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-400 bg-emerald-400/10">
                          HMAC firmado
                        </span>
                      )}
                      {!p.activo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-gray-400 bg-gray-400/10">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {p.descripcion && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{p.descripcion}</p>
                    )}
                    <p className="text-xs font-mono mt-1 truncate" style={{ color: 'var(--hc-muted)' }}>{p.url}</p>
                    {p.tipo === 'WEBHOOK' && eventos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {eventos.map(ev => (
                          <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                            style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {p.tipo === 'WEBHOOK' && p.activo && (
                      <button onClick={() => testWebhook(p)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-80 transition-all"
                        style={{ border: '1px solid var(--hc-border)', color: testOk === p.id ? '#10b981' : 'var(--hc-muted)' }}>
                        {testOk === p.id ? '✓ Enviado' : 'Test'}
                      </button>
                    )}
                    <button onClick={() => setLogPlugin(p)}
                      className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                      style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                      Logs
                    </button>
                    <button onClick={() => abrirEdicion(p)}
                      className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                      style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                      Editar
                    </button>
                    {p.activo && (
                      <button onClick={() => desactivar(p)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                        style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                        Desactivar
                      </button>
                    )}
                  </div>
                </div>

                {/* Iframe preview */}
                {p.tipo === 'IFRAME' && p.activo && (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', height: 320 }}>
                    <iframe src={p.url} title={p.nombre} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {logPlugin && <LogModal plugin={logPlugin} onClose={() => setLogPlugin(null)} />}
    </div>
  )
}
