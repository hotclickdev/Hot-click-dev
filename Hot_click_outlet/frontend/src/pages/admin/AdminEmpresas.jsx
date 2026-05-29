import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import api from '@/services/api'

const PLANES = ['GRATUITO', 'BASICO', 'PRO', 'ENTERPRISE']
const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'INACTIVO']

const PLAN_COLOR = {
  GRATUITO:   'bg-gray-500/15 text-gray-400',
  BASICO:     'bg-blue-500/15 text-blue-400',
  PRO:        'bg-purple-500/15 text-purple-400',
  ENTERPRISE: 'bg-orange-500/15 text-orange-400',
}
const ESTADO_COLOR = {
  ACTIVO:    'bg-green-500/15 text-green-400',
  SUSPENDIDO:'bg-red-500/15 text-red-400',
  INACTIVO:  'bg-gray-500/15 text-gray-400',
}

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CR').format(n)
}
function fmtMoney(n) {
  if (!n) return '₡0'
  return '₡' + new Intl.NumberFormat('es-CR').format(n)
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminEmpresas() {
  const [empresas, setEmpresas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('ALL')
  const [filtroPlan, setFiltroPlan]     = useState('ALL')
  const [selected, setSelected]   = useState(null)  // empresa en drawer
  const [detail, setDetail]       = useState(null)   // stats del drawer
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await api.get('/admin/empresas')
      setEmpresas(data.data ?? [])
    } catch {
      showToast('Error al cargar empresas', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function abrirDetalle(emp) {
    setSelected(emp)
    setDetail(null)
    try {
      const { data } = await api.get(`/admin/empresas/${emp.id}`)
      setDetail(data.data)
    } catch {}
  }

  async function cambiarEstado(id, estadoEmpresa) {
    setSaving(true)
    try {
      await api.put(`/admin/empresas/${id}/estado`, { estadoEmpresa })
      showToast(`Estado actualizado a ${estadoEmpresa}`)
      cargar()
      if (selected?.id === id) setSelected(s => ({ ...s, estadoEmpresa }))
    } catch {
      showToast('Error al actualizar estado', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function cambiarPlan(id, planSaas) {
    setSaving(true)
    try {
      await api.put(`/admin/empresas/${id}/plan`, { planSaas })
      showToast(`Plan actualizado a ${planSaas}`)
      cargar()
      if (selected?.id === id) setSelected(s => ({ ...s, planSaas }))
    } catch {
      showToast('Error al actualizar plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = empresas.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || e.nombreEmpresa?.toLowerCase().includes(q) || e.slug?.toLowerCase().includes(q) || e.correoEmpresa?.toLowerCase().includes(q)
    const matchE = filtroEstado === 'ALL' || e.estadoEmpresa === filtroEstado
    const matchP = filtroPlan   === 'ALL' || e.planSaas     === filtroPlan
    return matchQ && matchE && matchP
  })

  const kpis = {
    total:     empresas.length,
    activas:   empresas.filter(e => e.estadoEmpresa === 'ACTIVO').length,
    suspendidas: empresas.filter(e => e.estadoEmpresa === 'SUSPENDIDO').length,
    pro:       empresas.filter(e => ['PRO','ENTERPRISE'].includes(e.planSaas)).length,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Empresas registradas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Gestión de emprendedores en la plataforma</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: kpis.total,       color: 'text-blue-400' },
            { label: 'Activas',     value: kpis.activas,     color: 'text-green-400' },
            { label: 'Suspendidas', value: kpis.suspendidas, color: 'text-red-400' },
            { label: 'PRO/Enterprise', value: kpis.pro,      color: 'text-orange-400' },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa, slug o correo…"
            className="flex-1 min-w-48 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          >
            <option value="ALL">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filtroPlan}
            onChange={e => setFiltroPlan(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          >
            <option value="ALL">Todos los planes</option>
            {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
                  {['Empresa', 'Slug', 'Plan', 'Estado', 'Registro', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados</td></tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
                    className="hover:bg-[var(--hc-surface-2)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--hc-text)' }}>{emp.nombreComercial || emp.nombreEmpresa}</div>
                      <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{emp.correoEmpresa}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>{emp.slug}</td>
                    <td className="px-4 py-3">
                      <select
                        value={emp.planSaas}
                        onChange={e => cambiarPlan(emp.id, e.target.value)}
                        disabled={saving}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${PLAN_COLOR[emp.planSaas] ?? ''}`}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        {PLANES.map(p => <option key={p} value={p} style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={emp.estadoEmpresa}
                        onChange={e => cambiarEstado(emp.id, e.target.value)}
                        disabled={saving}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${ESTADO_COLOR[emp.estadoEmpresa] ?? ''}`}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        {ESTADOS.map(s => <option key={s} value={s} style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmtDate(emp.fechaRegistro)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => abrirDetalle(emp)}
                        className="text-xs px-3 py-1 rounded-lg transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div
            className="relative z-10 w-full max-w-sm flex flex-col overflow-y-auto"
            style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}
          >
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hc-border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>
                {selected.nombreComercial || selected.nombreEmpresa}
              </h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-[var(--hc-surface-2)]" style={{ color: 'var(--hc-muted)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Row label="Slug"      value={selected.slug} mono />
              <Row label="Correo"    value={selected.correoEmpresa} />
              <Row label="Teléfono"  value={selected.telefonoEmpresa || '—'} />
              <Row label="Registro"  value={fmtDate(selected.fechaRegistro)} />
              <Row label="Aprobación" value={fmtDate(selected.fechaAprobacion)} />

              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLOR[selected.planSaas]}`}>{selected.planSaas}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[selected.estadoEmpresa]}`}>{selected.estadoEmpresa}</span>
              </div>

              {detail ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { label: 'Usuarios', value: fmt(detail.totalUsuarios) },
                    { label: 'Productos', value: fmt(detail.totalProductos) },
                    { label: 'Pedidos', value: fmt(detail.totalPedidos) },
                    { label: 'Ventas', value: fmtMoney(detail.totalVentas) },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                      <div className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{k.value}</div>
                      <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Cargando estadísticas…</p>
              )}

              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Cambiar plan</p>
                <div className="flex flex-wrap gap-2">
                  {PLANES.map(p => (
                    <button
                      key={p}
                      onClick={() => cambiarPlan(selected.id, p)}
                      disabled={saving || selected.planSaas === p}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${PLAN_COLOR[p]}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: 'var(--hc-muted)' }}>Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS.map(s => (
                    <button
                      key={s}
                      onClick={() => cambiarEstado(selected.id, s)}
                      disabled={saving || selected.estadoEmpresa === s}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${ESTADO_COLOR[s]}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: 'var(--hc-muted)' }}>{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''} style={{ color: 'var(--hc-text)' }}>{value}</span>
    </div>
  )
}
