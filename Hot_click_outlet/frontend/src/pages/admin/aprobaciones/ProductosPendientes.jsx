import { useState } from 'react'
import { formatPrice } from '@/utils/format'
import BotonesAprobarRechazar from './BotonesAprobarRechazar'
import ConfirmAccion from './ConfirmAccion'
import EmptyPendientes from './EmptyPendientes'

export default function ProductosPendientes({ productos, loading, aprobar, rechazar }) {
  const [saving, setSaving] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [comentario, setComentario] = useState('')

  async function ejecutar(id, action) {
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
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando productos…</div>
  }
  if (productos.length === 0) {
    return <EmptyPendientes mensaje="Nada en esta cola. Aprobar el negocio publica sus productos; no hay revisión producto por producto." />
  }

  const ocupado = saving !== null
  return (
    <div className="space-y-3">
      {productos.map((producto) => (
        <div key={producto.id} className="rounded-xl p-4 flex items-center gap-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            {producto.imagenUrl && <img src={producto.imagenUrl} alt={producto.nombreProducto} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{producto.nombreProducto ?? '—'}</p>
            <div className="flex flex-wrap gap-x-4 text-xs" style={{ color: 'var(--hc-muted)' }}>
              <span>{formatPrice(producto.precioVenta)}</span>
              {producto.sku && <span className="font-mono">{producto.sku}</span>}
              <span>{producto.empresaNombre}</span>
              {producto.usuarioPide && <span>Por: {producto.usuarioPide}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {confirm?.id === producto.id ? (
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
            ) : (
              <BotonesAprobarRechazar
                disabled={ocupado}
                onAprobar={() => setConfirm({ id: producto.id, action: 'aprobar' })}
                onRechazar={() => { setConfirm({ id: producto.id, action: 'rechazar' }); setComentario('') }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
