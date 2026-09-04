import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Id } from '@/types/api'
import BotonesAprobarRechazar from './BotonesAprobarRechazar'
import ConfirmAccion from './ConfirmAccion'
import EmptyPendientes from './EmptyPendientes'
import type { AccionAprobacion, ConfirmAprobacion, CuentaCobroPendiente } from './aprobacionesHelpers'
import { fechaSolicitud } from './aprobacionesHelpers'

export default function CuentasCobroPendientes({ cuentas, loading, aprobar, rechazar }: {
  cuentas: CuentaCobroPendiente[]
  loading: boolean
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
      // el toast de error ya lo mostró el padre
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>{t('adminAprobaciones.loading')}</div>
  }
  if (cuentas.length === 0) {
    return <EmptyPendientes mensaje={t('adminAprobaciones.emptyCobro')} />
  }

  const ocupado = saving !== null
  return (
    <div className="space-y-3">
      {cuentas.map((cuenta) => (
        <div
          key={cuenta.id}
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>
            {cuenta.empresaNombre ?? '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {cuenta.tipo === 'iban' ? 'IBAN' : 'SINPE'}
            {cuenta.usuarioPide ? ` · Por: ${cuenta.usuarioPide}` : ''}
            {cuenta.fechaSolicitud ? ` · ${fechaSolicitud(cuenta.fechaSolicitud)}` : ''}
          </p>
          <p className="font-mono text-[13px]" style={{ color: 'var(--hc-text)' }}>
            {cuenta.mascaraActual ?? '—'} → {cuenta.mascaraNueva ?? '—'}
          </p>
          {confirm?.id === cuenta.id ? (
            <ConfirmAccion
              action={confirm.action}
              titulo={confirm.action === 'aprobar' ? '¿Aplicar el cambio de cuenta?' : '¿Rechazar el cambio?'}
              comentario={comentario}
              onComentarioChange={setComentario}
              mostrarComentario={confirm.action === 'rechazar'}
              onConfirm={() => ejecutar(cuenta.id, confirm.action)}
              onCancel={() => { setConfirm(null); setComentario('') }}
              saving={ocupado}
            />
          ) : (
            <BotonesAprobarRechazar
              disabled={ocupado}
              onAprobar={() => setConfirm({ id: cuenta.id, action: 'aprobar' })}
              onRechazar={() => { setConfirm({ id: cuenta.id, action: 'rechazar' }); setComentario('') }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
