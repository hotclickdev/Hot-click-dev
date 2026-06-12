import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const PLANES = ['GRATUITO', 'BASICO', 'PRO', 'ENTERPRISE']
const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'INACTIVO']

const ESTADO_LABEL_USUARIO = { 1: 'Activo', 2: 'Inactivo', 3: 'Eliminado', 4: 'Suspendido' }
const ESTADO_COLOR_USUARIO = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
}

const ESTADO_PEDIDO_STYLE = {
  PENDIENTE:      { bg: 'rgba(212,177,6,0.15)',   text: '#d4b106' },
  PAGADO:         { bg: 'rgba(23,71,168,0.14)',  text: 'var(--hc-accent)' },
  EN_PREPARACION: { bg: 'rgba(245,158,11,0.14)',  text: '#f59e0b' },
  ENVIADO:        { bg: 'rgba(96,165,250,0.14)',  text: '#6490EA' },
  ENTREGADO:      { bg: 'rgba(74,222,128,0.14)',  text: '#4ade80' },
  COMPLETADO:     { bg: 'rgba(63,108,222,0.14)',  text: 'var(--hc-blue-400)' },
  CANCELADO:      { bg: 'rgba(248,113,113,0.14)', text: '#f87171' },
}

const ROL_CONFIG = {
  PROPIETARIO: { label: 'Propietario', color: 'bg-amber-500/15 text-amber-400' },
  ADMIN:       { label: 'Admin',       color: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]' },
  EDITOR:      { label: 'Editor',      color: 'bg-blue-500/15 text-blue-400' },
  LECTOR:      { label: 'Lector',      color: 'bg-gray-500/15 text-gray-400' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_PEDIDO_STYLE[estado] ?? { bg: 'rgba(142,142,154,0.14)', text: '#A7B0BC' }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}>{estado}</span>
  )
}
function TabLoader() {
  return <div className="py-10 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</div>
}
function TabEmpty({ text }) {
  return (
    <div className="py-12 text-center">
      <div className="text-3xl mb-2">📭</div>
      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{text}</p>
    </div>
  )
}

const PLAN_COLOR = {
  GRATUITO:   'bg-gray-500/15 text-gray-400',
  BASICO:     'bg-blue-500/15 text-blue-400',
  PRO:        'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]',
  ENTERPRISE: 'bg-amber-500/15 text-amber-400',
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

const PAGE_SIZE = 10

export default function AdminEmpresas() {
  const toast = useToast()
  const [empresas, setEmpresas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('ACTIVO')
  const [filtroPlan, setFiltroPlan]     = useState('ALL')
  const [page, setPage]           = useState(0)
  const [selected, setSelected]   = useState(null)  // empresa en drawer
  const [detail, setDetail]       = useState(null)   // stats del drawer
  const [saving, setSaving]       = useState(false)
  const [tab, setTab]             = useState('resumen')
  const [tabProductos, setTabProductos] = useState(null)
  const [tabPedidos, setTabPedidos]     = useState(null)
  const [tabEquipo, setTabEquipo]       = useState(null)
  const [tabLoading, setTabLoading]     = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await api.get('/admin/empresas')
      setEmpresas(Array.isArray(data) ? data : (data?.data ?? []))
    } catch {
      toast({ message: 'Error al cargar empresas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function abrirDetalle(emp) {
    setSelected(emp)
    setDetail(null)
    setTab('resumen')
    setTabProductos(null)
    setTabPedidos(null)
    setTabEquipo(null)
    try {
      const { data } = await api.get(`/admin/empresas/${emp.id}`)
      setDetail(data?.id ? data : (data?.data ?? data))
    } catch {}
  }

  const cargarTab = useCallback(async (t, id) => {
    if (t === 'resumen') return
    const setter = t === 'productos' ? setTabProductos : t === 'pedidos' ? setTabPedidos : setTabEquipo
    const current = t === 'productos' ? tabProductos : t === 'pedidos' ? tabPedidos : tabEquipo
    if (current !== null) return // ya cargado
    setTabLoading(true)
    try {
      const { data } = await api.get(`/admin/empresas/${id}/${t}`)
      setter(Array.isArray(data) ? data : [])
    } catch {
      setter([])
    } finally {
      setTabLoading(false)
    }
  }, [tabProductos, tabPedidos, tabEquipo])

  async function cambiarEstado(id, estadoEmpresa) {
    setSaving(true)
    try {
      await api.put(`/admin/empresas/${id}/estado`, { estadoEmpresa })
      toast({ message: `Estado actualizado a ${estadoEmpresa}`, type: 'success' })
      cargar()
      if (selected?.id === id) setSelected(s => ({ ...s, estadoEmpresa }))
    } catch {
      toast({ message: 'Error al actualizar estado', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarPlan(id, planSaas) {
    setSaving(true)
    try {
      await api.put(`/admin/empresas/${id}/plan`, { planSaas })
      toast({ message: `Plan actualizado a ${planSaas}`, type: 'success' })
      cargar()
      if (selected?.id === id) setSelected(s => ({ ...s, planSaas }))
    } catch {
      toast({ message: 'Error al actualizar plan', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibilidad(id, visibilidadPublica) {
    setSaving(true)
    try {
      await api.put(`/admin/empresas/${id}/visibilidad`, { visibilidadPublica })
      toast({ message: visibilidadPublica ? 'Negocio visible al público' : 'Negocio oculto — catálogo invisible', type: 'success' })
      setEmpresas(prev => prev.map(e => e.id === id ? { ...e, visibilidadPublica } : e))
      if (selected?.id === id) setSelected(s => ({ ...s, visibilidadPublica }))
    } catch {
      toast({ message: 'Error al cambiar visibilidad', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = empresas.filter(e => {
    const q = search.toLowerCase()
    const matchQ = !q || e.nombreEmpresa?.toLowerCase().includes(q) || e.slug?.toLowerCase().includes(q) || e.correoEmpresa?.toLowerCase().includes(q)
    const matchE = filtroEstado === 'ALL' || e.estadoEmpresa === filtroEstado
    const matchP = filtroPlan   === 'ALL' || e.planSaas     === filtroPlan
    return matchQ && matchE && matchP
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const kpis = {
    total:     empresas.length,
    activas:   empresas.filter(e => e.estadoEmpresa === 'ACTIVO').length,
    suspendidas: empresas.filter(e => e.estadoEmpresa === 'SUSPENDIDO').length,
    pro:       empresas.filter(e => ['PRO','ENTERPRISE'].includes(e.planSaas)).length,
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Negocios en la plataforma</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Administrá planes, estados y visibilidad de cada emprendedor</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: kpis.total,       color: 'text-blue-400' },
            { label: 'Activas',     value: kpis.activas,     color: 'text-green-400' },
            { label: 'Suspendidas', value: kpis.suspendidas, color: 'text-red-400' },
            { label: 'PRO/Enterprise', value: kpis.pro,      color: 'text-amber-400' },
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
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar empresa, slug o correo…"
            className="flex-1 min-w-48 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <select
            value={filtroEstado}
            onChange={e => { setFiltroEstado(e.target.value); setPage(0) }}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          >
            <option value="ALL">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filtroPlan}
            onChange={e => { setFiltroPlan(e.target.value); setPage(0) }}
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
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
                  {['Empresa', 'Slug', 'Plan', 'Estado', 'Visible', 'Registro', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados</td></tr>
                ) : paged.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
                    className="hover:bg-[var(--hc-surface-2)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--hc-text)' }}>{emp.nombreComercial || emp.nombreEmpresa}</div>
                      <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{emp.correoEmpresa}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>{emp.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        title="Modificar desde Ver detalle"
                        className={`text-xs font-semibold px-2 py-1 rounded-full cursor-default select-none ${PLAN_COLOR[emp.planSaas] ?? ''}`}
                      >
                        {emp.planSaas}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        title="Modificar desde Ver detalle"
                        className={`text-xs font-semibold px-2 py-1 rounded-full cursor-default select-none ${ESTADO_COLOR[emp.estadoEmpresa] ?? ''}`}
                      >
                        {emp.estadoEmpresa}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleVisibilidad(emp.id, !emp.visibilidadPublica)}
                        disabled={saving}
                        title={emp.visibilidadPublica ? 'Ocultar negocio' : 'Hacer visible'}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity disabled:opacity-40"
                        style={{
                          background: emp.visibilidadPublica ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: emp.visibilidadPublica ? '#4ade80' : '#f87171',
                        }}
                      >
                        {emp.visibilidadPublica
                          ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Visible</>
                          : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>Oculto</>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{fmtDate(emp.fechaRegistro)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => abrirDetalle(emp)}
                        className="text-xs px-3 py-1 rounded-lg transition-colors hover:opacity-80"
                        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} · página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const idx = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i
                return (
                  <button
                    key={idx}
                    onClick={() => setPage(idx)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: page === idx ? 'var(--hc-accent)' : 'var(--hc-surface)',
                      border: `1px solid ${page === idx ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      color: page === idx ? '#fff' : 'var(--hc-text)',
                    }}
                  >
                    {idx + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer detalle — tabbed */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-2xl flex flex-col" style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>

            {/* Header */}
            <div className="px-5 pt-5 pb-0 shrink-0">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg truncate" style={{ color: 'var(--hc-text)' }}>
                    {selected.nombreComercial || selected.nombreEmpresa}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{selected.slug}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[selected.planSaas]}`}>{selected.planSaas}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[selected.estadoEmpresa] ?? ''}`}>{selected.estadoEmpresa}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selected.visibilidadPublica ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {selected.visibilidadPublica ? '👁 Visible' : '🙈 Oculto'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] shrink-0" style={{ color: 'var(--hc-muted)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1" style={{ borderBottom: '1px solid var(--hc-border)' }}>
                {[
                  { id: 'resumen',   label: 'Resumen' },
                  { id: 'productos', label: `Productos${detail ? ` (${detail.totalProductos ?? 0})` : ''}` },
                  { id: 'pedidos',   label: `Pedidos${detail ? ` (${detail.totalPedidos ?? 0})` : ''}` },
                  { id: 'equipo',    label: `Equipo${detail ? ` (${detail.totalUsuarios ?? 0})` : ''}` },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); cargarTab(t.id, selected.id) }}
                    className="px-4 py-2.5 text-sm font-medium transition-colors relative"
                    style={{
                      color: tab === t.id ? 'var(--hc-accent)' : 'var(--hc-muted)',
                      borderBottom: tab === t.id ? '2px solid var(--hc-accent)' : '2px solid transparent',
                      marginBottom: '-1px',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── RESUMEN ── */}
              {tab === 'resumen' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Row label="Correo"     value={selected.correoEmpresa} />
                    <Row label="Teléfono"   value={selected.telefonoEmpresa || '—'} />
                    <Row label="Registro"   value={fmtDate(selected.fechaRegistro)} />
                    <Row label="Aprobación" value={fmtDate(selected.fechaAprobacion)} />
                  </div>

                  {detail ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Usuarios',  value: fmt(detail.totalUsuarios),  color: 'text-blue-400' },
                        { label: 'Productos', value: fmt(detail.totalProductos), color: 'text-[var(--hc-blue-400)]' },
                        { label: 'Pedidos',   value: fmt(detail.totalPedidos),   color: 'text-amber-400' },
                        { label: 'Ventas',    value: fmtMoney(detail.totalVentas), color: 'text-green-400' },
                      ].map(k => (
                        <div key={k.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                          <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs" style={{ color: 'var(--hc-muted)' }}>Cargando estadísticas…</div>
                  )}

                  <div className="rounded-xl p-4 space-y-2" style={{ background: selected.visibilidadPublica ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${selected.visibilidadPublica ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                      {selected.visibilidadPublica ? 'Negocio visible al público — productos en catálogo.' : 'Negocio oculto — no aparece en catálogo.'}
                    </p>
                    <button onClick={() => toggleVisibilidad(selected.id, !selected.visibilidadPublica)} disabled={saving}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg transition-opacity disabled:opacity-40"
                      style={{ background: selected.visibilidadPublica ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: selected.visibilidadPublica ? '#f87171' : '#4ade80' }}>
                      {selected.visibilidadPublica ? '🙈 Ocultar del catálogo' : '👁 Hacer visible en catálogo'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Cambiar plan</p>
                    <div className="flex flex-wrap gap-2">
                      {PLANES.map(p => (
                        <button key={p} onClick={() => cambiarPlan(selected.id, p)} disabled={saving || selected.planSaas === p}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${selected.planSaas === p ? 'ring-2 ring-offset-1 ring-[var(--hc-accent)]' : ''} ${PLAN_COLOR[p]}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--hc-muted)' }}>Cambiar estado</p>
                    <div className="flex flex-wrap gap-2">
                      {ESTADOS.map(s => (
                        <button key={s} onClick={() => cambiarEstado(selected.id, s)} disabled={saving || selected.estadoEmpresa === s}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${selected.estadoEmpresa === s ? 'ring-2 ring-offset-1 ring-[var(--hc-accent)]' : ''} ${ESTADO_COLOR[s]}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── PRODUCTOS ── */}
              {tab === 'productos' && (
                tabLoading ? <TabLoader /> :
                !tabProductos || tabProductos.length === 0 ? <TabEmpty text="Sin productos aún" /> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {tabProductos.map(p => (
                      <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface-2)' }}>
                        <div className="aspect-square bg-black/10 relative overflow-hidden">
                          {p.imagenUrl
                            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" loading="lazy" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          }
                          <div className="absolute top-1.5 right-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.visibleCatalogo ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                              {p.visibleCatalogo ? 'Visible' : 'Oculto'}
                            </span>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                          {p.categoria && <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{p.categoria}</p>}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs font-bold" style={{ color: 'var(--hc-accent)' }}>
                              ₡{new Intl.NumberFormat('es-CR').format(p.precio ?? 0)}
                            </span>
                            <span className="text-[10px]" style={{ color: p.stock <= 0 ? '#f87171' : 'var(--hc-muted)' }}>
                              {p.stock <= 0 ? 'Sin stock' : `${p.stock} uds`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── PEDIDOS ── */}
              {tab === 'pedidos' && (
                tabLoading ? <TabLoader /> :
                !tabPedidos || tabPedidos.length === 0 ? <TabEmpty text="Sin pedidos aún" /> : (
                  <div className="space-y-2">
                    {tabPedidos.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>#{p.id}</span>
                            <EstadoBadge estado={p.estado} />
                          </div>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{p.cliente}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>{p.metodoPago} · {fmtDate(p.fecha)}</p>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: 'var(--hc-text)' }}>
                          ₡{new Intl.NumberFormat('es-CR').format(p.total ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── EQUIPO ── */}
              {tab === 'equipo' && (
                tabLoading ? <TabLoader /> :
                !tabEquipo || tabEquipo.length === 0 ? <TabEmpty text="Sin miembros de equipo" /> : (
                  <div className="space-y-2">
                    {tabEquipo.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                        <div className="w-9 h-9 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
                          {m.nombre?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{m.nombre.trim()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROL_CONFIG[m.rol]?.color ?? 'bg-gray-500/15 text-gray-400'}`}>
                              {ROL_CONFIG[m.rol]?.label ?? m.rol}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{m.correo}</p>
                          {m.telefono && m.telefono !== '00000000' && (
                            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{m.telefono}</p>
                          )}
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>Se unió {fmtDate(m.fechaIngreso)}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR_USUARIO[m.estado] ?? ''}`}>
                          {ESTADO_LABEL_USUARIO[m.estado] ?? m.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      )}

    </>
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
