import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import api from '@/services/api'

const ESTADO_COLOR = {
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  ACTIVO:               'bg-green-500/15 text-green-400',
  RECHAZADO:            'bg-red-500/15 text-red-400',
  SUSPENDIDO:           'bg-orange-500/15 text-orange-400',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminAprobaciones() {
  const [solicitudes, setSolicitudes] = useState([])
  const [stats, setStats]             = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(null)
  const [toast, setToast]             = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      const [{ data: sol }, { data: st }] = await Promise.all([
        api.get('/admin/solicitudes-aprobacion'),
        api.get('/admin/solicitudes-aprobacion/stats'),
      ])
      setSolicitudes(sol.data ?? [])
      setStats(st.data ?? {})
    } catch {
      showToast('Error al cargar solicitudes', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function aprobar(id) {
    setSaving(id + '_aprobar')
    try {
      await api.put(`/admin/solicitudes-aprobacion/${id}/aprobar`)
      showToast('Empresa aprobada correctamente')
      cargar()
    } catch {
      showToast('Error al aprobar', 'error')
    } finally {
      setSaving(null)
    }
  }

  async function rechazar(id) {
    setSaving(id + '_rechazar')
    try {
      await api.put(`/admin/solicitudes-aprobacion/${id}/rechazar`)
      showToast('Solicitud rechazada')
      cargar()
    } catch {
      showToast('Error al rechazar', 'error')
    } finally {
      setSaving(null)
    }
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Aprobaciones de empresas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Revisá y aprobá las solicitudes de registro de nuevos emprendedores
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendientes',  value: stats.pendientes  ?? 0, color: 'text-yellow-400' },
            { label: 'Activas',     value: stats.activas     ?? 0, color: 'text-green-400' },
            { label: 'Suspendidas', value: stats.suspendidas ?? 0, color: 'text-red-400' },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando solicitudes…</div>
        ) : solicitudes.length === 0 ? (
          <div className="py-12 text-center rounded-xl" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Todo al día</p>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>No hay solicitudes pendientes de aprobación.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map(sol => (
              <div key={sol.id} className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: 'var(--hc-text)' }}>
                        {sol.nombreComercial || sol.nombreEmpresa}
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[sol.estadoEmpresa] ?? ''}`}>
                        {sol.estadoEmpresa?.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                        {sol.planSaas}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <Info label="Correo empresa"  value={sol.correoEmpresa} />
                      <Info label="Teléfono"        value={sol.telefonoEmpresa || '—'} />
                      <Info label="Slug"            value={sol.slug} mono />
                      <Info label="Registrado"      value={fmtDate(sol.fechaRegistro)} />
                      {sol.adminNombre && <Info label="Admin"         value={sol.adminNombre} />}
                      {sol.adminCorreo && <Info label="Correo admin"  value={sol.adminCorreo} />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => aprobar(sol.id)}
                      disabled={saving === sol.id + '_aprobar'}
                      className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#22c55e', color: '#fff' }}
                    >
                      {saving === sol.id + '_aprobar' ? 'Aprobando…' : '✓ Aprobar'}
                    </button>
                    <button
                      onClick={() => rechazar(sol.id)}
                      disabled={saving === sol.id + '_rechazar'}
                      className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: '#ef4444' }}
                    >
                      {saving === sol.id + '_rechazar' ? 'Rechazando…' : '✕ Rechazar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}

function Info({ label, value, mono }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0" style={{ color: 'var(--hc-muted)' }}>{label}:</span>
      <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--hc-text)' }}>{value}</span>
    </div>
  )
}
