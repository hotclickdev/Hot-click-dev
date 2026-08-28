import AiControlToggle from './AiControlToggle'
import type { Id } from '@/types/api'
import type { EmpresaAi, FlagAi } from './aiControlHelpers'

/** Tab control por cuenta — flags chat/copilot. */
export default function AiControlControlTab({ empresas, toggling, onToggleFlag, onToggleTodos }: {
  empresas: EmpresaAi[]
  toggling: string | null
  onToggleFlag: (empresaId: Id, flag: FlagAi, activo: boolean) => void
  onToggleTodos: (flag: FlagAi, activar: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl px-4 py-3 flex items-center gap-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
              Chat público — todos
            </p>
            <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Widget de búsqueda en el storefront</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onToggleTodos('chat_publico', true)}
              className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              Activar todos
            </button>
            <button type="button" onClick={() => onToggleTodos('chat_publico', false)}
              className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              Desactivar todos
            </button>
          </div>
        </div>

        <div className="rounded-2xl px-4 py-3 flex items-center gap-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
              Copilot — todos
            </p>
            <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>Chat AI en panel admin del emprendedor</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onToggleTodos('copilot_emprendedor', true)}
              className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              Activar todos
            </button>
            <button type="button" onClick={() => onToggleTodos('copilot_emprendedor', false)}
              className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              Desactivar todos
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                {['Cuenta', 'Plan', 'Chat público', 'Copilot admin'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
                  <td className="px-4 py-3 font-medium text-sm" style={{ color: 'var(--hc-text)' }}>
                    {e.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                      {e.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AiControlToggle
                        activo={e.chatActivo}
                        disabled={toggling === `${e.id}-chat_publico`}
                        onChange={() => onToggleFlag(e.id, 'chat_publico', e.chatActivo)}
                      />
                      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {e.chatActivo ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AiControlToggle
                        activo={e.copilotActivo}
                        disabled={toggling === `${e.id}-copilot_emprendedor`}
                        onChange={() => onToggleFlag(e.id, 'copilot_emprendedor', e.copilotActivo)}
                      />
                      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {e.copilotActivo ? 'Activo' : 'Oculto'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
