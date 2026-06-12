import { useState, useEffect } from 'react'
import api from '@/services/api'

const MONEDAS = ['CRC','USD','MXN','COP','PEN','GTQ','HNL','NIO','EUR']

export default function AdminMultipais() {
  const [config, setConfig]     = useState(null)
  const [paises, setPaises]     = useState([])
  const [tasas, setTasas]       = useState([])
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk]             = useState(false)
  const [error, setError]       = useState(null)
  const [form, setForm]         = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/admin/multipais/config'),
      api.get('/admin/multipais/paises'),
      api.get('/admin/multipais/tasas'),
    ]).then(([c, p, t]) => {
      setConfig(c.data); setForm({ ...c.data }); setPaises(p.data); setTasas(t.data)
    }).catch(() => setError('No se pudo cargar la configuración'))
  }, [])

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target?.value ?? e }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true); setOk(false); setError(null)
    try {
      const { data } = await api.put('/admin/multipais/config', form)
      setConfig(data); setForm({ ...data }); setOk(true)
      setTimeout(() => setOk(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally { setGuardando(false) }
  }

  if (!form) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
    </div>
  )

  const selectedPais = paises.find(p => p.codigo === form.paisOperacion)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
          LATAM — Configuración Multi-país
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Configura el país de operación, moneda y locale de tu empresa
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={guardar} className="space-y-5">
        {/* País selector */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>País de operación</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {paises.map(p => (
              <button key={p.codigo} type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  paisOperacion: p.codigo,
                  monedaDefecto: p.moneda,
                  monedaFacturacion: p.moneda,
                  localeCodigo: p.locale,
                }))}
                className="py-3 px-2 rounded-xl text-center transition-all"
                style={{
                  border: `1.5px solid ${form.paisOperacion === p.codigo ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  backgroundColor: form.paisOperacion === p.codigo ? 'rgba(23,71,168,0.08)' : 'var(--hc-bg)',
                  color: 'var(--hc-text)',
                }}>
                <div className="text-2xl">{p.bandera}</div>
                <div className="text-[10px] mt-1 font-medium">{p.nombre}</div>
                <div className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{p.moneda}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fine-grain config */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Configuración detallada</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Moneda de catálogo</label>
              <select value={form.monedaDefecto ?? 'CRC'} onChange={set('monedaDefecto')}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Moneda de facturación</label>
              <select value={form.monedaFacturacion ?? 'CRC'} onChange={set('monedaFacturacion')}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Tasa de impuesto (%)</label>
              <input type="number" step="0.01" min="0" max="30"
                value={form.taxRatePct ?? 13}
                onChange={set('taxRatePct')}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Locale de formato</label>
            <input value={form.localeCodigo ?? 'es-CR'} onChange={set('localeCodigo')}
              placeholder="es-CR"
              className="w-full sm:w-48 px-3 py-2 rounded-xl text-sm font-mono outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
              Controla cómo se formatean los números y fechas. Ej: es-CR, es-MX, en-US
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
          <span className="text-3xl">{selectedPais?.bandera ?? '🌎'}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
              {selectedPais?.nombre ?? form.paisOperacion} · {form.monedaDefecto}
            </p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Impuesto {form.taxRatePct}% · Locale {form.localeCodigo} ·&nbsp;
              Ej: {new Intl.NumberFormat(form.localeCodigo, { style: 'currency', currency: form.monedaFacturacion }).format(12500)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={guardando}
            className="px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {guardando ? 'Guardando…' : 'Guardar configuración'}
          </button>
          {ok && <span className="text-sm text-emerald-400">✓ Guardado correctamente</span>}
        </div>
      </form>

      {/* Tasas de cambio */}
      {tasas.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="px-4 py-3" style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
              Tasas de cambio de referencia (1 CRC =)
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              Solo para visualización — los montos se guardan en la moneda original
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y"
            style={{ divideColor: 'var(--hc-border)' }}>
            {tasas.map((t, i) => (
              <div key={i} className="px-4 py-3" style={{ backgroundColor: 'var(--hc-surface)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{t.moneda_hacia}</p>
                <p className="text-sm font-mono" style={{ color: 'var(--hc-accent)' }}>
                  {Number(t.tasa).toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
