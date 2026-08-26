import { useState, useEffect } from 'react'
import { productService } from '@/services/productService'
import CloseIcon from '@/components/ui/CloseIcon'

const fmtDate = (d) => d ? new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const TIPO_COLORS = {
  VENTA:              { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  VENTA_POS:          { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  COMPRA:             { bg: 'rgba(52,211,153,0.12)',  text: '#34d399' },
  AJUSTE_ENTRADA:     { bg: 'rgba(52,211,153,0.12)',  text: '#34d399' },
  AJUSTE_SALIDA:      { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  RESERVA:            { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  LIBERACION_RESERVA: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  DEVOLUCION:         { bg: 'rgba(151,183,243,0.12)', text: 'var(--hc-blue-300)' },
  TRANSFERENCIA:      { bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
}

function TipoBadge({ tipo }) {
  const { bg, text } = TIPO_COLORS[tipo] ?? { bg: 'rgba(255,255,255,0.06)', text: 'var(--hc-muted)' }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}>
      {tipo?.replace('_', ' ') ?? '—'}
    </span>
  )
}

export default function KardexDrawer({ producto, onClose }) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!producto?.id) return
    setLoading(true)
    productService.kardex(producto.id)
      .then(setMovimientos)
      .catch(() => setMovimientos([]))
      .finally(() => setLoading(false))
  }, [producto?.id])

  if (!producto) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      role="presentation"
      onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <div className="w-full max-w-2xl h-full overflow-y-auto flex flex-col"
        style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '-4px 0 32px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b sticky top-0 z-10"
          style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'var(--hc-surface)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>
              Kardex — {producto.nombre ?? producto.nombreProducto}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              {producto.sku && (
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>SKU: {producto.sku}</span>
              )}
              {producto.barcode && (
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Barcode: {producto.barcode}</span>
              )}
              <span className="text-xs font-medium" style={{ color: 'var(--hc-accent)' }}>
                Stock actual: {producto.stockActual ?? producto.stock ?? '—'}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            <CloseIcon />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-4">
          {(() => {
            if (loading) {
              return (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
                </div>
              )
            }
            if (movimientos.length === 0) {
              return (
                <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
                  <p className="text-sm">Sin movimientos de stock registrados</p>
                </div>
              )
            }
            return (
            <div className="space-y-2">
              {movimientos.map((m, i) => (
                <div key={m.id ?? i} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Tipo */}
                  <div className="shrink-0">
                    <TipoBadge tipo={m.tipo ?? m.tipoMovimiento} />
                  </div>

                  {/* Stock antes → después */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                      {m.stockActualAntes}
                    </span>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2}
                      viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>
                      {m.stockActualDespues}
                    </span>
                    <span className="text-xs ml-1"
                      style={{ color: m.stockActualDespues >= m.stockActualAntes ? '#34d399' : '#f87171' }}>
                      ({m.stockActualDespues >= m.stockActualAntes ? '+' : ''}{m.stockActualDespues - m.stockActualAntes})
                    </span>
                  </div>

                  {/* Referencia y operador */}
                  <div className="flex-1 min-w-0">
                    {m.referencia && (
                      <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{m.referencia}</p>
                    )}
                    {m.operadorCorreo && (
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {m.operadorCorreo}
                      </p>
                    )}
                  </div>

                  {/* Fecha */}
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)' }}>
                    {fmtDate(m.fechaMovimiento)}
                  </span>
                </div>
              ))}
            </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
