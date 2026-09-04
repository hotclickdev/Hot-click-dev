import { empresasOperables, nombreVisibleEmpresa, type EmpresaLista } from './empresasHelpers'
import type { Id } from '@/types/api'

type EmpresaOpcion = Pick<EmpresaLista, 'id' | 'nombreComercial' | 'nombreEmpresa' | 'slug'>

export default function EmpresaDestinoSelect({
  empresas,
  value,
  onChange,
  id = 'empresa-destino',
}: {
  empresas: EmpresaOpcion[]
  value: string
  onChange: (id: string) => void
  id?: string
}) {
  const opciones = empresasOperables(empresas)
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="text-xs font-semibold shrink-0" style={{ color: 'var(--hc-muted)' }}>
        Negocio destino
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="min-h-11 w-full sm:max-w-sm rounded-xl px-3 text-sm"
        style={{
          backgroundColor: 'var(--hc-surface-2)',
          color: value ? 'var(--hc-text)' : 'var(--hc-muted)',
          border: `1px solid ${value ? 'var(--hc-border)' : 'rgba(239,68,68,0.45)'}`,
        }}
      >
        <option value="">Elegí el negocio…</option>
        {opciones.map((emp) => (
          <option key={String(emp.id)} value={String(emp.id)}>
            {etiquetaEmpresa(emp)}
          </option>
        ))}
      </select>
    </div>
  )
}

function etiquetaEmpresa(emp: EmpresaOpcion): string {
  return nombreVisibleEmpresa(emp) ?? `Empresa ${emp.id}`
}

export function idEmpresaOpcional(id: Id | string | undefined): number | undefined {
  if (id == null || id === '') return undefined
  const n = Number(id)
  return Number.isFinite(n) ? n : undefined
}
