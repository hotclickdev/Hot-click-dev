import { Link } from 'react-router-dom'
import ComprasEstadoBadge from './ComprasEstadoBadge'
import { fmt, fmtDate, ESTADO_META } from './comprasHelpers'
import TextoMas from '@/components/ui/TextoMas'

/** Lista expandible de órdenes de compra. */
export default function ComprasOrdenList({
  ordenesFiltradas,
  filtro,
  expanded,
  onToggleExpand,
  onRecibir,
  onCancelar,
}) {
  if (ordenesFiltradas.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          {filtro === 'TODAS' ? 'No hay órdenes de compra' : `No hay órdenes ${ESTADO_META[filtro]?.label?.toLowerCase()}`}
        </p>
        <Link to="/admin/compras/nueva" className="mt-3 inline-flex items-center text-sm font-medium" style={{ color: 'var(--hc-accent)' }}>
          <TextoMas>Crear primera orden</TextoMas>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {ordenesFiltradas.map((orden) => (
        <div key={orden.id} className="rounded-2xl overflow-hidden border"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <button type="button" className="flex items-center gap-4 p-4 w-full text-left"
            onClick={() => onToggleExpand(expanded === orden.id ? null : orden.id)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {orden.numeroOrden}
                </span>
                <ComprasEstadoBadge estado={orden.estado} />
                {orden.proveedor && (
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {orden.proveedor.nombre}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
                <span>{fmtDate(orden.fechaOrden)}</span>
                <span>{(orden.items ?? []).length} ítem{(orden.items ?? []).length === 1 ? '' : 's'}</span>
                {orden.usuario && <span>por {orden.usuario.nombre}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold" style={{ color: 'var(--hc-accent)' }}>₡{fmt(orden.total)}</p>
              {orden.fechaRecepcion && (
                <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Recibida {fmtDate(orden.fechaRecepcion)}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {(orden.estado === 'PENDIENTE' || orden.estado === 'PARCIAL') && (
                <button type="button" onClick={() => onRecibir(orden)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                  Recibir
                </button>
              )}
              {orden.estado === 'PENDIENTE' && (
                <button type="button" onClick={() => onCancelar(orden.id)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  Cancelar
                </button>
              )}
            </div>
            <svg className={`w-4 h-4 shrink-0 transition-transform ${expanded === orden.id ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              style={{ color: 'var(--hc-muted)' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {expanded === orden.id && (
            <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-xs">
                  <thead>
                    <tr style={{ color: 'var(--hc-muted)' }}>
                      {['Producto', 'Ordenado', 'Recibido', 'P. Unitario', 'Subtotal'].map((h) => (
                        <th key={h} className="text-left pb-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(orden.items ?? []).map((item) => (
                      <tr key={item.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="py-2" style={{ color: 'var(--hc-text)' }}>
                          {item.producto?.nombreProducto ?? 'Producto'}
                        </td>
                        <td className="py-2" style={{ color: 'var(--hc-muted)' }}>{item.cantidad}</td>
                        <td className="py-2" style={{ color: item.cantidadRecibida >= item.cantidad ? '#34d399' : 'var(--hc-muted)' }}>
                          {item.cantidadRecibida}
                        </td>
                        <td className="py-2" style={{ color: 'var(--hc-muted)' }}>₡{fmt(item.precioUnitario)}</td>
                        <td className="py-2 font-medium" style={{ color: 'var(--hc-text)' }}>
                          ₡{fmt(item.cantidad * item.precioUnitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {orden.notas && (
                <p className="mt-3 text-xs" style={{ color: 'var(--hc-muted)' }}>Notas: {orden.notas}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
