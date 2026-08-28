import AiControlPctBar from './AiControlPctBar'
import { fmt, type EmpresaAi } from './aiControlHelpers'

/** Tab consumo IA por empresa. */
export default function AiControlConsumoTab({ empresas, costoTotal }: {
  empresas: EmpresaAi[]
  costoTotal: number
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
              {['Cuenta', 'Plan', 'Llamadas', 'Uso vs límite', 'Tokens entrada', 'Tokens salida', 'Costo USD'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}
                className="hover:brightness-110 transition-all">
                <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--hc-text)' }}>
                  {e.nombre}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                    {e.plan}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {e.llamadas}
                  {e.limite > 0 && (
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--hc-muted)' }}>
                      / {e.limite}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AiControlPctBar pct={e.pct} limite={e.limite} />
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                  {fmt(e.tokensEntrada)}
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                  {fmt(e.tokensSalida)}
                </td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: e.costoUsd > 0.01 ? '#fbbf24' : 'var(--hc-muted)' }}>
                  ${e.costoUsd.toFixed(4)}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--hc-border)' }}>
              <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-right"
                style={{ color: 'var(--hc-muted)' }}>
                TOTAL DEL MES
              </td>
              <td className="px-4 py-3 text-sm font-bold" style={{ color: '#fbbf24' }}>
                ${costoTotal.toFixed(4)} USD
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
