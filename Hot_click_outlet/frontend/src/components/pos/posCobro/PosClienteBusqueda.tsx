import { SEG_COLOR, type ClienteCobroPos } from './posCobroHelpers'
import CloseIcon from '@/components/ui/CloseIcon'

export default function PosClienteBusqueda({
  clienteQuery,
  buscarCliente,
  clienteId,
  limpiarCliente,
  sugerencias,
  seleccionarCliente,
  buscando,
  clienteInfo,
}: {
  clienteQuery: string
  buscarCliente: (q: string) => void
  clienteId: number | string | null
  limpiarCliente: () => void
  sugerencias: ClienteCobroPos[]
  seleccionarCliente: (c: ClienteCobroPos) => void
  buscando: boolean
  clienteInfo: ClienteCobroPos | null
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>
        Cliente
        {clienteInfo && (
          <span className="ml-2 font-normal" style={{ color: 'var(--hc-muted)' }}>
            — <span style={{ color: SEG_COLOR[clienteInfo.segmento ?? ''] ?? '#A7B0BC' }}>
              {clienteInfo.segmento ?? 'NUEVO'}
            </span>
            {' · '}
            <span style={{ color: '#fbbf24' }}>{clienteInfo.puntosFidelidad ?? 0} pts</span>
          </span>
        )}
      </p>
      <div className="relative">
        <input type="text" value={clienteQuery}
          onChange={e => buscarCliente(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono…"
          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}/>
        {clienteId && (
          <button type="button" onClick={limpiarCliente}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: '#f87171' }}
            aria-label="Quitar cliente">
            <CloseIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {sugerencias.length > 0 && (
        <div className="mt-1 rounded-xl overflow-hidden border"
          style={{ backgroundColor: 'var(--hc-bg)', borderColor: 'var(--hc-border)' }}>
          {sugerencias.slice(0, 5).map(c => (
            <button type="button" key={c.id} onClick={() => seleccionarCliente(c)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors hover:bg-[var(--hc-surface-2)] border-b last:border-0"
              style={{ borderColor: 'var(--hc-border)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--hc-text)' }}>
                  {c.nombre} {c.apellidoPaterno}
                </p>
                <p style={{ color: 'var(--hc-muted)' }}>{c.correo}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p style={{ color: '#fbbf24' }}>{c.puntosFidelidad ?? 0} pts</p>
                <p style={{ color: SEG_COLOR[c.segmento ?? ''] ?? '#A7B0BC', fontSize: '10px' }}>
                  {c.segmento ?? 'NUEVO'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {buscando && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--hc-muted)' }}>Buscando…</p>
      )}

      {!clienteId && (
        <p className="text-[10px] mt-1" style={{ color: 'var(--hc-muted)' }}>
          Sin cliente identificado: se registra como "Mostrador"
        </p>
      )}
    </div>
  )
}
