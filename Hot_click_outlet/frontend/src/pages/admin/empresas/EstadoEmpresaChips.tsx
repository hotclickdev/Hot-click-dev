import { ESTADOS, ESTADO_COLOR, type EmpresaLista } from './empresasHelpers'
import type { Id } from '@/types/api'

export default function EstadoEmpresaChips({
  selected,
  saving,
  onCambiarEstado,
}: {
  selected: EmpresaLista
  saving: boolean
  onCambiarEstado: (id: Id, estadoEmpresa: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ESTADOS.map((estado) => (
        <button
          type="button"
          key={estado}
          onClick={() => onCambiarEstado(selected.id, estado)}
          disabled={saving || selected.estadoEmpresa === estado}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${selected.estadoEmpresa === estado ? 'ring-2 ring-offset-1 ring-[var(--hc-accent)]' : ''} ${ESTADO_COLOR[estado]}`}
        >
          {estado}
        </button>
      ))}
    </div>
  )
}
