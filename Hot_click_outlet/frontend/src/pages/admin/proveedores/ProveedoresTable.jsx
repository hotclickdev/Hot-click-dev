import { formatPrice } from '@/utils/format'
import CloseIcon from '@/components/ui/CloseIcon'

export default function ProveedoresTable({ proveedores, onCostos, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              {['Proveedor', 'Tipo', 'Contacto', 'Teléfono', 'Correo', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proveedores.map(p => (
              <tr key={p.id} className="border-t transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                  {p.notas && <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--hc-muted)' }}>{p.notas}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                    style={p.tipo === 'MATERIA_PRIMA'
                      ? { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
                      : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
                    {p.tipo === 'MATERIA_PRIMA' ? 'Materia prima' : 'Producto terminado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.contacto || '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.telefono || '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{p.correo || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onCostos(p)}
                      className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-white/10"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-muted)' }}>
                      Costos
                    </button>
                    <button type="button" onClick={() => onEdit(p)}
                      className="px-3 py-1 text-xs rounded-lg transition-colors hover:bg-white/10"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-muted)' }}>
                      Editar
                    </button>
                    <button type="button" onClick={() => onDelete(p)}
                      className="px-3 py-1 text-xs rounded-lg transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ProveedorCostosModal({ costosTarget, historial, loadingHistorial, onClose }) {
  if (!costosTarget) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            Costos — {costosTarget.nombre}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            <CloseIcon />
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Precios pagados en órdenes de compra a este proveedor.
        </p>

        {loadingHistorial ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
          </div>
        ) : historial.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: 'var(--hc-muted)' }}>
            Todavía no hay órdenes de compra registradas para este proveedor.
          </p>
        ) : (
          <div className="space-y-2">
            {historial.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{h.producto}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
                    Orden {h.numeroOrden} · {h.estadoOrden} · {new Date(h.fechaOrden).toLocaleDateString('es-CR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{formatPrice(h.precioUnitario)}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>x{h.cantidad}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
