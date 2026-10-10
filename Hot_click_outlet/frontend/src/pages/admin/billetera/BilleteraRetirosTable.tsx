import { useState } from 'react'
import { fmt, ESTADO_BADGE, type WalletPayout } from './billeteraHelpers'
import ComprobanteRetiro from './ComprobanteRetiro'

/** Tabla historial de retiros. */
export default function BilleteraRetirosTable({ payouts }: { payouts: WalletPayout[] }) {
  const [comprobante, setComprobante] = useState<WalletPayout | null>(null)
  return (
    <div className="bg-hc-surface border border-hc-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-hc-muted border-b border-hc-border">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Monto</th>
            <th className="px-4 py-3">Método</th>
            <th className="px-4 py-3">Destino</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Notas admin</th>
            <th className="px-4 py-3"><span className="sr-only">Comprobante</span></th>
          </tr>
        </thead>
        <tbody>
          {payouts.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-hc-muted">Sin retiros aún</td></tr>
          )}
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-white/4 hover:bg-white/2">
              <td className="px-4 py-3 text-hc-muted whitespace-nowrap">
                {new Date(p.fechaSolicitud).toLocaleDateString('es-CR')}
              </td>
              <td className="px-4 py-3 font-mono font-semibold">₡{fmt(p.monto)}</td>
              <td className="px-4 py-3">{p.metodo}</td>
              <td className="px-4 py-3 text-hc-muted">
                {p.metodo === 'SINPE' ? p.destinoSinpe : (p.destinoIban ?? '—')}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] ?? ''}`}>
                  {p.estado}
                </span>
              </td>
              <td className="px-4 py-3 text-hc-muted text-xs">{p.notasAdmin ?? '—'}</td>
              <td className="px-4 py-3">{p.estado === 'PAGADO' && (<button type="button" onClick={() => setComprobante(p)} className="text-xs underline">Comprobante</button>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {comprobante && <ComprobanteRetiro payout={comprobante} onClose={() => setComprobante(null)} />}
    </div>
  )
}
