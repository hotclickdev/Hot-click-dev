import { useState, type Dispatch, type SetStateAction } from 'react'
import { letraDe } from '@/prototipo/admin/adminData'
import {
  AdminEntityRow,
  AdminFilterChip,
  AdminSearchField,
} from '@/prototipo/admin/AdminUi'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { EyeIcon, EyeOffIcon } from './empresasIcons'
import {
  CHIPS_ESTADO_TIENDA,
  PAGE_SIZE,
  PLANES,
  empresasOperables,
  esEmpresaInternaPlataforma,
  etiquetaEstadoTienda,
  filtrarEmpresas,
  indicesPagina,
  nombreVisibleEmpresa,
  tonoEstadoTiendaLista,
  type EmpresaLista,
} from './empresasHelpers'
import type { Id } from '@/types/api'

function VisibilidadToggle({ emp, saving, onToggle }: {
  emp: EmpresaLista
  saving: boolean
  onToggle: (id: Id, visibilidadPublica: boolean) => void
}) {
  const visible = emp.visibilidadPublica
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(emp.id, !visible) }}
      disabled={saving}
      title={visible ? 'Ocultar negocio' : 'Hacer visible'}
      className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-opacity disabled:opacity-40"
      style={{
        background: visible ? 'var(--hc-success-bg)' : 'var(--hc-danger-bg)',
        color: visible ? 'var(--hc-success)' : 'var(--hc-danger)',
      }}
    >
      {visible ? <><EyeIcon />Visible</> : <><EyeOffIcon />Oculto</>}
    </button>
  )
}

function EmpresaFila({ emp, saving, onToggleVisibilidad, onAbrirDetalle }: {
  emp: EmpresaLista
  saving: boolean
  onToggleVisibilidad: (id: Id, visibilidadPublica: boolean) => void
  onAbrirDetalle: (emp: EmpresaLista) => void
}) {
  const nombre = nombreVisibleEmpresa(emp) ?? 'Tienda'
  return (
    <li className="flex items-center gap-2">
      <button type="button" onClick={() => onAbrirDetalle(emp)} className="min-w-0 flex-1 text-left">
        <AdminEntityRow
          letra={letraDe(nombre)}
          titulo={nombre}
          subtitulo={emp.slug ?? emp.correoEmpresa ?? ''}
          badge={etiquetaEstadoTienda(emp.estadoEmpresa)}
          badgeTono={tonoEstadoTiendaLista(emp.estadoEmpresa)}
        />
      </button>
      <VisibilidadToggle emp={emp} saving={saving} onToggle={onToggleVisibilidad} />
    </li>
  )
}

function Paginacion({ page, totalPages, filteredCount, onPage }: {
  page: number
  totalPages: number
  filteredCount: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs text-hc-muted">
        {filteredCount} tienda{filteredCount === 1 ? '' : 's'} · página {page + 1} de {totalPages}
      </span>
      <div className="flex gap-1">
        <button type="button"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          <TextoFlecha dir="atras">Anterior</TextoFlecha>
        </button>
        {indicesPagina(page, totalPages).map((idx) => (
          <button type="button" key={idx} onClick={() => onPage(idx)}
            className="w-8 h-8 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: page === idx ? 'var(--hc-primary)' : 'var(--hc-surface)',
              border: `1px solid ${page === idx ? 'var(--hc-primary)' : 'var(--hc-border)'}`,
              color: page === idx ? '#fff' : 'var(--hc-text)',
            }}
          >
            {idx + 1}
          </button>
        ))}
        <button type="button"
          onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          <TextoFlecha>Siguiente</TextoFlecha>
        </button>
      </div>
    </div>
  )
}

export type EmpresaListProps = {
  empresas: EmpresaLista[]
  loading: boolean
  saving: boolean
  onToggleVisibilidad: (id: Id, visibilidadPublica: boolean) => void
  onAbrirDetalle: (emp: EmpresaLista) => void
}

/**
 * Lista de tiendas (Figma 42:128) con datos reales.
 */
export default function EmpresaList({ empresas, loading, saving, onToggleVisibilidad, onAbrirDetalle }: EmpresaListProps) {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('ALL')
  const [filtroPlan, setFiltroPlan] = useState('ALL')
  const [page, setPage] = useState(0)

  const internas = empresas.filter((e) => esEmpresaInternaPlataforma(e)).length
  const filtered = filtrarEmpresas(empresas, { search, filtroEstado, filtroPlan })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function cambiarFiltro(setter: Dispatch<SetStateAction<string>>) {
    return (valor: string) => { setter(valor); setPage(0) }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-[18px] pb-8 md:max-w-4xl">
      <header>
        <h1 className="font-display text-[22px] font-bold">Tiendas</h1>
        <p className="mt-0.5 text-xs text-hc-muted">
          {empresasOperables(empresas).length} tiendas en el marketplace
          {internas > 0 ? ` · ${internas} interna de plataforma oculta` : ''}
        </p>
      </header>
      <AdminSearchField
        value={search}
        onChange={cambiarFiltro(setSearch)}
        placeholder="Buscar tienda o vendedor"
        label="Buscar tienda"
        dataMm="buscar-tienda"
      />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {CHIPS_ESTADO_TIENDA.map((chip) => (
          <AdminFilterChip key={chip.id} activo={filtroEstado === chip.id} onClick={() => cambiarFiltro(setFiltroEstado)(chip.id)}>
            {chip.label}
          </AdminFilterChip>
        ))}
      </div>
      <label className="hidden text-xs text-hc-muted md:block">
        Plan
        <select
          value={filtroPlan}
          onChange={(e) => cambiarFiltro(setFiltroPlan)(e.target.value)}
          className="ml-2 min-h-9 rounded-xl border border-hc-border bg-hc-surface px-3 text-sm"
        >
          <option value="ALL">Todos</option>
          {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {cuerpoLista(loading, paged, { saving, onToggleVisibilidad, onAbrirDetalle })}
      <Paginacion page={page} totalPages={totalPages} filteredCount={filtered.length} onPage={setPage} />
    </div>
  )
}

function cuerpoLista(loading: boolean, paged: EmpresaLista[], { saving, onToggleVisibilidad, onAbrirDetalle }: {
  saving: boolean
  onToggleVisibilidad: (id: Id, visibilidadPublica: boolean) => void
  onAbrirDetalle: (emp: EmpresaLista) => void
}) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-hc-muted">Cargando…</p>
  }
  if (paged.length === 0) {
    return <p className="py-8 text-center text-sm text-hc-muted">Sin resultados</p>
  }
  return (
    <ul className="flex flex-col gap-5">
      {paged.map((emp) => (
        <EmpresaFila
          key={String(emp.id)}
          emp={emp}
          saving={saving}
          onToggleVisibilidad={onToggleVisibilidad}
          onAbrirDetalle={onAbrirDetalle}
        />
      ))}
    </ul>
  )
}
