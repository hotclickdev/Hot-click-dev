import Badge from '@/components/ui/Badge'
import {
  ESTADO_BADGE,
  PLAN_COLORS,
  PLAN_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  getEstadoStr,
  getRolStr,
} from './usuarioHelpers'

/**
 * @param {{
 *   displayed: object[]
 *   getPlanStr: (u: object) => string | null
 *   columnLabels: string[]
 *   emptyLabel: string
 *   approveLabel: string
 *   rejectLabel: string
 *   editLabel: string
 *   onApprove: (id: number|string) => void
 *   onReject: (id: number|string) => void
 *   onEdit: (u: object) => void
 *   onBlock: (u: object) => void
 *   onUnblock: (u: object) => void
 *   onDelete: (u: object) => void
 *   onRestore: (u: object) => void
 * }} props
 */
export default function UsuariosTable({
  displayed,
  getPlanStr,
  columnLabels,
  emptyLabel,
  approveLabel,
  rejectLabel,
  editLabel,
  onApprove,
  onReject,
  onEdit,
  onBlock,
  onUnblock,
  onDelete,
  onRestore,
}) {
  if (displayed.length === 0) {
    return (
      <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
        <div className="text-center py-12 text-[#8e8e9a]">{emptyLabel}</div>
      </div>
    )
  }

  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/8">
              {columnLabels.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayed.map((u) => {
              const estadoStr = getEstadoStr(u)
              const rolStr = getRolStr(u)
              const planStr = getPlanStr(u)
              const isSuspended = estadoStr === 'SUSPENDIDO'
              const isDeleted = estadoStr === 'ELIMINADO'
              return (
                <tr
                  key={u.id}
                  className={`hover:bg-white/3 transition-colors ${claseFilaUsuario(isDeleted, isSuspended)}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${claseAvatarUsuario(isDeleted, isSuspended)}`}
                      >
                        {(u.nombre ?? u.correo)?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-[#e8e8ed] truncate block" title={u.nombre ?? ''}>
                          {u.nombre ?? '—'}
                        </span>
                        {isSuspended && <span className="text-[10px] text-amber-400">Bloqueado</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8e8e9a] text-xs" title={u.correo}>
                    <span className="truncate block max-w-[220px]">{u.correo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={ROLE_COLORS[rolStr] ?? 'default'}>
                        {ROLE_LABELS[rolStr] ?? rolStr}
                      </Badge>
                      {rolStr === 'EMPRENDEDOR' && planStr && (
                        <Badge variant={PLAN_COLORS[planStr] ?? 'default'}>
                          {PLAN_LABELS[planStr] ?? planStr}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_BADGE[estadoStr] ?? 'default'}>{estadoStr}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDeleted && (
                        <button type="button"
                          onClick={() => onRestore(u)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Restaurar
                        </button>
                      )}

                      {!isDeleted && estadoStr === 'PENDIENTE' && (
                        <>
                          <button type="button"
                            onClick={() => onApprove(u.id)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            {approveLabel}
                          </button>
                          <button type="button"
                            onClick={() => onReject(u.id)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            {rejectLabel}
                          </button>
                        </>
                      )}

                      {!isDeleted && (
                        <button type="button"
                          onClick={() => onEdit(u)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors"
                        >
                          {editLabel}
                        </button>
                      )}

                      {!isDeleted && (
                        isSuspended ? (
                          <button type="button"
                            onClick={() => onUnblock(u)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                              />
                            </svg>
                            Desbloquear
                          </button>
                        ) : estadoStr !== 'PENDIENTE' && (
                          <button type="button"
                            onClick={() => onBlock(u)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a2 2 0 114 0v4"
                              />
                            </svg>
                            Bloquear
                          </button>
                        )
                      )}

                      {!isDeleted && (
                        <button type="button"
                          onClick={() => onDelete(u)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/8 hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function claseFilaUsuario(isDeleted, isSuspended) {
  if (isDeleted) return 'opacity-60'
  if (isSuspended) return 'opacity-75'
  return ''
}

function claseAvatarUsuario(isDeleted, isSuspended) {
  if (isDeleted) return 'bg-red-500/15 text-red-400'
  if (isSuspended) return 'bg-amber-500/15 text-amber-400'
  return 'bg-[#4f7cff]/15 text-[#4f7cff]'
}
