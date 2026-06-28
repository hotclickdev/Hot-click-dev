import { useState, useEffect } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const ESTADO_COLOR = {
  PENDIENTE_APROBACION: 'bg-yellow-500/15 text-yellow-400',
  ACTIVO:               'bg-green-500/15 text-green-400',
  RECHAZADO:            'bg-red-500/15 text-red-400',
  SUSPENDIDO:           'bg-amber-500/15 text-amber-400',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminAprobaciones() {
  const toast = useToast()
  const [solicitudes, setSolicitudes] = useState([])
  const [stats, setStats]             = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(null)
  const [confirm, setConfirm]         = useState(null) // { id, action: 'aprobar' | 'rechazar', nombre }

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      setLoading(true)
      // Interceptor unwraps ResponseDTO → data is already the array
      const { data: sol } = await api.get('/admin/solicitudes-aprobacion')
      const lista = Array.isArray(sol) ? sol : []
      setSolicitudes(lista.filter(e => e.estadoEmpresa === 'PENDIENTE_APROBACION'))
      // Compute stats locally
      const { data: todas } = await api.get('/admin/empresas')
      const t = Array.isArray(todas) ? todas : []
      setStats({
        pendientes:  t.filter(e => e.estadoEmpresa === 'PENDIENTE_APROBACION').length,
        activas:     t.filter(e => e.estadoEmpresa === 'ACTIVO').length,
        suspendidas: t.filter(e => e.estadoEmpresa === 'SUSPENDIDO').length,
      })
    } catch {
      toast({ message: 'Error al cargar solicitudes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function aprobar(id) {
    setSaving(`${id}_aprobar`)
    try {
      await api.put(`/admin/solicitudes-aprobacion/${id}/aprobar`)
      toast({ message: 'Negocio aprobado correctamente', type: 'success' })
      setConfirm(null)
      cargar()
    } catch {
      toast({ message: 'Error al aprobar', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  async function rechazar(id) {
    setSaving(`${id}_rechazar`)
    try {
      await api.put(`/admin/solicitudes-aprobacion/${id}/rechazar`)
      toast({ message: 'Solicitud rechazada', type: 'success' })
      setConfirm(null)
      cargar()
    } catch {
      toast({ message: 'Error al rechazar', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Solicitudes pendientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Negocios nuevos esperando tu aprobación para activarse en la plataforma
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Por aprobar',  value: stats.pendientes  ?? 0, color: 'text-yellow-400' },
            { label: 'Activos',      value: stats.activas     ?? 0, color: 'text-green-400' },
            { label: 'Suspendidos',  value: stats.suspendidas ?? 0, color: 'text-red-400' },
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
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
              <svg className="w-6 h-6" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Sin pendientes</p>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Todas las solicitudes están al día.</p>
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
                    {confirm?.id === sol.id ? (
                      <div className="rounded-xl p-3 space-y-2 text-center"
                        style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${confirm.action === 'aprobar' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                        <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
                          {confirm.action === 'aprobar' ? '¿Confirmar aprobación?' : '¿Confirmar rechazo?'}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{confirm.nombre}</p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => confirm.action === 'aprobar' ? aprobar(sol.id) : rechazar(sol.id)}
                            disabled={saving !== null}
                            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            style={{ backgroundColor: confirm.action === 'aprobar' ? '#22c55e' : '#ef4444', color: '#fff' }}
                          >
                            {saving !== null ? '…' : 'Sí, confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirm(null)}
                            disabled={saving !== null}
                            className="px-2 py-1.5 rounded-lg text-xs disabled:opacity-50"
                            style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirm({ id: sol.id, action: 'aprobar', nombre: sol.nombreComercial || sol.nombreEmpresa })}
                          disabled={saving !== null}
                          className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: '#22c55e', color: '#fff' }}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => setConfirm({ id: sol.id, action: 'rechazar', nombre: sol.nombreComercial || sol.nombreEmpresa })}
                          disabled={saving !== null}
                          className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: '#ef4444' }}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
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
