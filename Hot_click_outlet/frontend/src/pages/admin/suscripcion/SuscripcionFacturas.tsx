import { fmtFechaSuscripcion, fmtMontoFactura, estiloEstadoFactura, etiquetaEstadoFactura } from './suscripcionHelpers'
import type { FacturaBilling } from './suscripcionHelpers'
import type { CSSProperties } from 'react'

export default function SuscripcionFacturas({ facturas }: { facturas: FacturaBilling[] }) {
  if (facturas.length === 0) return null
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <div className="px-5 py-3 border-b" style={{ backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Historial de facturas</p>
      </div>
      <div className="divide-y" style={{ divideColor: 'var(--hc-border)' } as CSSProperties}>
        {facturas.map(f => (
          <div key={f.id} className="flex items-center justify-between px-5 py-3 gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                {fmtFechaSuscripcion(f.periodoInicio)} – {fmtFechaSuscripcion(f.periodoFin)}
              </p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {fmtMontoFactura(f.montoCentavos, f.moneda)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={estiloEstadoFactura(f.estado)}>
                {etiquetaEstadoFactura(f.estado)}
              </span>
              {f.urlPdf && (
                <a href={f.urlPdf} target="_blank" rel="noreferrer"
                  className="text-xs" style={{ color: 'var(--hc-accent)' }}>
                  PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
