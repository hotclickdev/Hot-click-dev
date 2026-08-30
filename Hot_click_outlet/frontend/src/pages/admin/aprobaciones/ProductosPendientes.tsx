import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import type { Id } from '@/types/api'
import { AdminBadge } from '@/prototipo/admin/AdminUi'
import BotonesAprobarRechazar from './BotonesAprobarRechazar'
import ConfirmAccion from './ConfirmAccion'
import EmptyPendientes from './EmptyPendientes'
import { metaProductoPendiente, type AccionAprobacion, type ConfirmAprobacion, type ProductoPendiente } from './aprobacionesHelpers'

export default function ProductosPendientes({ productos, loading, aprobar, rechazar }: {
  productos: ProductoPendiente[]
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
    return <div className="py-12 text-center text-sm text-hc-muted">{t('adminAprobaciones.loading')}</div>
  }
  if (productos.length === 0) {
    return <EmptyPendientes mensaje={t('adminAprobaciones.emptyProductos')} />
  }

  const ocupado = saving !== null
  return (
    <ul className="flex flex-col gap-4">
      {productos.map((producto, idx) => (
        <li key={producto.id} className="rounded-[14px] border border-hc-border p-3.5">
          <div className="flex items-start gap-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-hc-surface-2">
              {producto.imagenUrl ? (
                <img src={producto.imagenUrl} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{producto.nombreProducto ?? '—'}</p>
              <p className="text-[11px] text-hc-muted">{metaProductoPendiente(producto)}</p>
              <p className="mt-0.5 text-xs font-bold text-hc-primary">{formatPrice(producto.precioVenta)}</p>
            </div>
            <AdminBadge tono="warn">Pendiente</AdminBadge>
          </div>
          {confirm?.id === producto.id ? (
            <div className="mt-3">
              <ConfirmAccion
                action={confirm.action}
                titulo={confirm.action === 'aprobar' ? '¿Publicar producto?' : '¿Rechazar producto?'}
                comentario={comentario}
                onComentarioChange={setComentario}
                mostrarComentario={confirm.action === 'rechazar'}
                onConfirm={() => ejecutar(producto.id, confirm.action)}
                onCancel={() => { setConfirm(null); setComentario('') }}
                saving={ocupado}
              />
            </div>
          ) : (
            <BotonesAprobarRechazar
              disabled={ocupado}
              dataMmAprobar={idx === 0 ? 'aprobar-primero' : undefined}
              onAprobar={() => setConfirm({ id: producto.id, action: 'aprobar' })}
              onRechazar={() => { setConfirm({ id: producto.id, action: 'rechazar' }); setComentario('') }}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
