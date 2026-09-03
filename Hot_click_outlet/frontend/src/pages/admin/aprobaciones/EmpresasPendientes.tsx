import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nombreVisibleEmpresa } from '../empresas/empresasHelpers'
import type { Id } from '@/types/api'
import BotonesAprobarRechazar from './BotonesAprobarRechazar'
import ConfirmAccion from './ConfirmAccion'
import EmptyPendientes from './EmptyPendientes'
import Info from './Info'
import {
  ESTADO_COLOR,
  fechaSolicitud,
  kpisAprobacion,
  type AccionAprobacion,
  type ConfirmAprobacion,
  type EmpresaSolicitud,
  type StatsAprobacion,
} from './aprobacionesHelpers'

export default function EmpresasPendientes({ solicitudes, loading, stats, aprobar, rechazar }: {
  solicitudes: EmpresaSolicitud[]
  loading: boolean
  stats: StatsAprobacion
  aprobar: (id: Id) => Promise<void>
  rechazar: (id: Id, comentario: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAprobacion | null>(null)
  const [comentario, setComentario] = useState('')

  async function ejecutar(id: Id, action: AccionAprobacion) {
    setSaving(`${id}_${action}`)
    try {
      if (action === 'aprobar') await aprobar(id)
      else await rechazar(id, comentario)
      setConfirm(null)
      setComentario('')
    } catch {
      // el toast de error ya lo mostró el padre; dejamos el confirm abierto para reintentar
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {kpisAprobacion(stats).map((kpi) => (
          <div key={kpi.labelKey} className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{t(kpi.labelKey)}</div>
          </div>
        ))}
      </div>
      <ListaEmpresas
        loading={loading}
        solicitudes={solicitudes}
        confirm={confirm}
        comentario={comentario}
        onComentarioChange={setComentario}
        saving={saving}
        onEjecutar={ejecutar}
        onConfirm={setConfirm}
        onCancel={() => { setConfirm(null); setComentario('') }}
      />
    </>
  )
}

function ListaEmpresas({ loading, solicitudes, confirm, comentario, onComentarioChange, saving, onEjecutar, onConfirm, onCancel }: {
  loading: boolean
  solicitudes: EmpresaSolicitud[]
  confirm: ConfirmAprobacion | null
  comentario: string
  onComentarioChange: (v: string) => void
  saving: string | null
  onEjecutar: (id: Id, action: AccionAprobacion) => Promise<void>
  onConfirm: (confirm: ConfirmAprobacion) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>{t('adminAprobaciones.loading')}</div>
  }
  if (solicitudes.length === 0) {
    return <EmptyPendientes mensaje={t('adminAprobaciones.emptyEmpresas')} />
  }
  const ocupado = saving !== null
  return (
    <div className="space-y-3">
      {solicitudes.map((sol) => (
        <TarjetaEmpresa
          key={sol.id}
          sol={sol}
          confirm={confirm}
          comentario={comentario}
          onComentarioChange={onComentarioChange}
          ocupado={ocupado}
          onEjecutar={onEjecutar}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ))}
    </div>
  )
}

function TarjetaEmpresa({ sol, confirm, comentario, onComentarioChange, ocupado, onEjecutar, onConfirm, onCancel }: {
  sol: EmpresaSolicitud
  confirm: ConfirmAprobacion | null
  comentario: string
  onComentarioChange: (v: string) => void
  ocupado: boolean
  onEjecutar: (id: Id, action: AccionAprobacion) => Promise<void>
  onConfirm: (confirm: ConfirmAprobacion) => void
  onCancel: () => void
}) {
  const nombre = nombreVisibleEmpresa(sol)
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{nombre}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[sol.estadoEmpresa ?? ''] ?? ''}`}>
              {sol.estadoEmpresa?.replace('_', ' ')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
              {sol.planSaas}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <Info label="Correo empresa" value={sol.correoEmpresa} />
            <Info label="Teléfono" value={sol.telefonoEmpresa || '—'} />
            <Info label="Slug" value={sol.slug} mono />
            <Info label="Registrado" value={fechaSolicitud(sol.fechaRegistro)} />
            {sol.adminNombre && <Info label="Admin" value={sol.adminNombre} />}
            {sol.adminCorreo && <Info label="Correo admin" value={sol.adminCorreo} />}
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {confirm?.id === sol.id ? (
            <ConfirmAccion
              action={confirm.action}
              titulo={confirm.action === 'aprobar' ? '¿Confirmar aprobación?' : '¿Confirmar rechazo?'}
              detalle={confirm.nombre}
              comentario={comentario}
              onComentarioChange={onComentarioChange}
              mostrarComentario={confirm.action === 'rechazar'}
              onConfirm={() => onEjecutar(sol.id, confirm.action)}
              onCancel={onCancel}
              saving={ocupado}
            />
          ) : (
            <BotonesAprobarRechazar
              disabled={ocupado}
              onAprobar={() => onConfirm({ id: sol.id, action: 'aprobar', nombre })}
              onRechazar={() => { onConfirm({ id: sol.id, action: 'rechazar', nombre }); onComentarioChange('') }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
