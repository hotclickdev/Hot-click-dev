import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import type { Id } from '@/types/api'
import BotonesAprobarRechazar from './BotonesAprobarRechazar'
import ConfirmAccion from './ConfirmAccion'
import EmptyPendientes from './EmptyPendientes'
import type { AccionAprobacion, ConfirmAprobacion, OfertaPendiente } from './aprobacionesHelpers'

export default function OfertasPendientes({ ofertas, loading, aprobar, rechazar }: {
  ofertas: OfertaPendiente[]
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
      // el toast de error ya lo mostró el padre; dejamos el confirm abierto para reintentar
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>{t('adminAprobaciones.loading')}</div>
  }
  if (ofertas.length === 0) {
    return <EmptyPendientes mensaje={t('adminAprobaciones.emptyOfertas')} />
  }

  const ocupado = saving !== null
  return (
    <div className="space-y-3">
      {ofertas.map((oferta) => (
        <div key={oferta.id} className="rounded-xl p-4 flex items-center gap-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            {oferta.imagenUrl && <img src={oferta.imagenUrl} alt={oferta.nombreProducto} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{oferta.nombreProducto ?? '—'}</p>
            <div className="flex flex-wrap gap-x-4 text-xs" style={{ color: 'var(--hc-muted)' }}>
              <span>{formatPrice(oferta.precioVenta)}</span>
              {oferta.porcentajeDescuento && <span className="font-semibold" style={{ color: '#ef4444' }}>-{oferta.porcentajeDescuento}%</span>}
              <span>{oferta.empresaNombre}</span>
              {oferta.usuarioPide && <span>Por: {oferta.usuarioPide}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {confirm?.id === oferta.id ? (
              <ConfirmAccion
                action={confirm.action}
                titulo={confirm.action === 'aprobar' ? '¿Aplicar promoción?' : '¿Rechazar promoción?'}
                comentario={comentario}
                onComentarioChange={setComentario}
                mostrarComentario={confirm.action === 'rechazar'}
                onConfirm={() => ejecutar(oferta.id, confirm.action)}
                onCancel={() => { setConfirm(null); setComentario('') }}
                saving={ocupado}
              />
            ) : (
              <BotonesAprobarRechazar
                disabled={ocupado}
                onAprobar={() => setConfirm({ id: oferta.id, action: 'aprobar' })}
                onRechazar={() => { setConfirm({ id: oferta.id, action: 'rechazar' }); setComentario('') }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
