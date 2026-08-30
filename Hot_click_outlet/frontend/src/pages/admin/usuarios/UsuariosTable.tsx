import Badge from '@/components/ui/Badge'
import {
  ESTADO_BADGE,
  PLAN_COLORS,
  PLAN_LABELS,
  getEstadoStr,
  getRolStr,
  tonoRolFigma,
  type UsuarioAdmin,
} from './usuarioHelpers'
import type { Id } from '@/types/api'

export type UsuariosTableProps = {
  displayed: UsuarioAdmin[]
  getPlanStr: (u: UsuarioAdmin) => string | null | undefined
  columnLabels: string[]
  emptyLabel: string
  approveLabel: string
  rejectLabel: string
  editLabel: string
  onApprove: (id: Id) => void
  onReject: (id: Id) => void
  onEdit: (u: UsuarioAdmin) => void
  onBlock: (u: UsuarioAdmin) => void
  onUnblock: (u: UsuarioAdmin) => void
  onDelete: (u: UsuarioAdmin) => void
  onRestore: (u: UsuarioAdmin) => void
}

const BTN = 'px-2.5 py-1 text-xs rounded-lg transition-colors'
const BTN_OK = `${BTN} bg-[var(--hc-success-bg)] text-hc-success hover:opacity-90`
const BTN_WARN = `${BTN} bg-[var(--hc-warning-bg)] text-hc-warning hover:opacity-90`
const BTN_MUTED = `${BTN} bg-hc-surface-2 text-hc-muted hover:opacity-80`
const BTN_DANGER = `${BTN} bg-[var(--hc-danger-bg)] text-hc-danger hover:opacity-90`

/**
 * Lista de usuarios (Figma 42:191) con acciones reales.
 */
export default function UsuariosTable({
  displayed,
  getPlanStr,
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
}: UsuariosTableProps) {
  if (displayed.length === 0) {
    return (
      <div className="rounded-2xl border border-hc-border bg-hc-surface">
        <div className="py-12 text-center text-sm text-hc-muted">{emptyLabel}</div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-5">
      {displayed.map((u) => {
        const estadoStr = getEstadoStr(u)
        const rolStr = getRolStr(u)
        const planStr = getPlanStr(u)
        const isSuspended = estadoStr === 'SUSPENDIDO'
        const isDeleted = estadoStr === 'ELIMINADO'
        const pill = tonoRolFigma(rolStr, estadoStr)
        const letra = (u.nombre ?? u.correo ?? '?')[0]?.toUpperCase() ?? '?'
        return (
          <li key={String(u.id)} className={claseFilaUsuario(isDeleted, isSuspended)}>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--hc-surface-3,#F1F3F6)] text-[15px] font-bold text-hc-muted">
                {letra}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-hc-text">{u.nombre ?? '—'}</p>
                <p className="truncate text-[11px] text-hc-muted">{u.correo}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${pill.clase}`}>
                {pill.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-14">
              {rolStr === 'EMPRENDEDOR' && planStr && (
                <Badge variant={PLAN_COLORS[planStr] ?? 'default'}>{PLAN_LABELS[planStr] ?? planStr}</Badge>
              )}
              {estadoStr !== 'ACTIVO' && estadoStr !== 'SUSPENDIDO' && (
                <Badge variant={ESTADO_BADGE[estadoStr] ?? 'default'}>{estadoStr}</Badge>
              )}
              <AccionesUsuario
                u={u}
                estadoStr={estadoStr}
                isDeleted={isDeleted}
                isSuspended={isSuspended}
                approveLabel={approveLabel}
                rejectLabel={rejectLabel}
                editLabel={editLabel}
                onApprove={onApprove}
                onReject={onReject}
                onEdit={onEdit}
                onBlock={onBlock}
                onUnblock={onUnblock}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function AccionesUsuario({
  u, estadoStr, isDeleted, isSuspended, approveLabel, rejectLabel, editLabel,
  onApprove, onReject, onEdit, onBlock, onUnblock, onDelete, onRestore,
}: {
  u: UsuarioAdmin
  estadoStr: string
  isDeleted: boolean
  isSuspended: boolean
  approveLabel: string
  rejectLabel: string
  editLabel: string
  onApprove: (id: Id) => void
  onReject: (id: Id) => void
  onEdit: (u: UsuarioAdmin) => void
  onBlock: (u: UsuarioAdmin) => void
  onUnblock: (u: UsuarioAdmin) => void
  onDelete: (u: UsuarioAdmin) => void
  onRestore: (u: UsuarioAdmin) => void
}) {
  if (isDeleted) {
    return <button type="button" onClick={() => onRestore(u)} className={BTN_OK}>Restaurar</button>
  }
  return (
    <>
      {estadoStr === 'PENDIENTE' && (
        <>
          <button type="button" onClick={() => onApprove(u.id)} className={BTN_OK}>{approveLabel}</button>
          <button type="button" onClick={() => onReject(u.id)} className={BTN_DANGER}>{rejectLabel}</button>
        </>
      )}
      <button type="button" onClick={() => onEdit(u)} className={BTN_MUTED}>{editLabel}</button>
      {isSuspended ? (
        <button type="button" onClick={() => onUnblock(u)} className={BTN_OK}>Desbloquear</button>
      ) : estadoStr !== 'PENDIENTE' ? (
        <button type="button" onClick={() => onBlock(u)} className={BTN_WARN}>Bloquear</button>
      ) : null}
      <button type="button" onClick={() => onDelete(u)} className={BTN_DANGER}>
        Eliminar
      </button>
    </>
  )
}

function claseFilaUsuario(isDeleted: boolean, isSuspended: boolean): string {
  if (isDeleted) return 'opacity-60'
  if (isSuspended) return 'opacity-75'
  return ''
}
