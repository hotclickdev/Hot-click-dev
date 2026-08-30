import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { CopilotInsights, CopilotProductoInsight } from './copilotChatHelpers'

type CopilotInsightCardsProps = {
  insights: CopilotInsights | null
  confirmandoId: number | string | null
  setConfirmandoId: (id: number | string | null) => void
  aplicandoId: number | string | null
  aplicarDescuento: (producto: CopilotProductoInsight) => void
}

export default function CopilotInsightCards({
  insights,
  confirmandoId,
  setConfirmandoId,
  aplicandoId,
  aplicarDescuento,
}: CopilotInsightCardsProps) {
  const { lentos = [], enRiesgo = [], reponerMas = [] } = insights ?? {}
  if (!lentos.length && !enRiesgo.length && !reponerMas.length) return null

  return (
    <div className="space-y-2 mb-3">
      {enRiesgo.length > 0 && (
        <InsightBlock titulo="Stock crítico — reponer">
          {enRiesgo.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1.5"
              style={{ borderTop: '1px solid var(--hc-border)' }}>
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p style={{ color: 'var(--hc-muted)' }}>Stock {p.stock} · mínimo {p.minimo}</p>
              </div>
              <Link to="/admin/productos"
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                Reponer
              </Link>
            </div>
          ))}
        </InsightBlock>
      )}

      {reponerMas.length > 0 && (
        <InsightBlock titulo="Se venden y quedan pocas unidades">
          {reponerMas.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1.5"
              style={{ borderTop: '1px solid var(--hc-border)' }}>
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p style={{ color: 'var(--hc-muted)' }}>Stock {p.stock} · {p.udsVendidas} uds en 30 días</p>
              </div>
              <Link to="/admin/productos"
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                Comprar más
              </Link>
            </div>
          ))}
        </InsightBlock>
      )}

      {lentos.length > 0 && (
        <InsightBlock titulo="Productos sin ventas recientes — acción sugerida">
          {lentos.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1.5"
              style={{ borderTop: '1px solid var(--hc-border)' }}>
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p style={{ color: 'var(--hc-muted)' }}>Stock {p.stock} · última venta hace {p.diasSinVenta}</p>
              </div>
              {confirmandoId === p.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span style={{ color: 'var(--hc-muted)' }}>¿Aplicar {p.descuentoSugeridoPct}%?</span>
                  <button type="button" onClick={() => aplicarDescuento(p)} disabled={aplicandoId === p.id}
                    className="px-3 py-2 rounded-lg font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                    {aplicandoId === p.id ? '...' : 'Confirmar'}
                  </button>
                  <button type="button" onClick={() => setConfirmandoId(null)} disabled={aplicandoId === p.id}
                    className="px-3 py-2 rounded-lg disabled:opacity-50"
                    style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmandoId(p.id)}
                  className="shrink-0 px-3 py-2 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                  Aplicar {p.descuentoSugeridoPct}% descuento
                </button>
              )}
            </div>
          ))}
        </InsightBlock>
      )}
    </div>
  )
}

function InsightBlock({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-1"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{titulo}</p>
      {children}
    </div>
  )
}
