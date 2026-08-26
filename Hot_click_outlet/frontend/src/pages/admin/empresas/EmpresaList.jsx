import { useState } from 'react'
import { formatDateShort } from '@/utils/format'
import { EyeIcon, EyeOffIcon } from './empresasIcons'
import {
  COLUMNAS_TABLA,
  ESTADO_COLOR,
  ESTADOS,
  PAGE_SIZE,
  PLAN_COLOR,
  PLANES,
  filtrarEmpresas,
  indicesPagina,
  kpisEmpresas,
  nombreVisibleEmpresa,
} from './empresasHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

function Kpis({ empresas }) {
  const kpis = kpisEmpresas(empresas)
  const items = [
    { label: 'Total', value: kpis.total, color: 'text-blue-400' },
    { label: 'Activas', value: kpis.activas, color: 'text-green-400' },
    { label: 'Suspendidas', value: kpis.suspendidas, color: 'text-red-400' },
    { label: 'PRO/Enterprise', value: kpis.pro, color: 'text-amber-400' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
        </div>
      ))}
    </div>
  )
}

function Filtros({ search, filtroEstado, filtroPlan, onSearch, onEstado, onPlan }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar empresa, slug o correo…"
        className="flex-1 min-w-48 px-3 py-2 rounded-xl text-sm outline-none"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      />
      <select
        value={filtroEstado}
        onChange={(e) => onEstado(e.target.value)}
        className="px-3 py-2 rounded-xl text-sm outline-none"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      >
        <option value="ALL">Todos los estados</option>
        {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select
        value={filtroPlan}
        onChange={(e) => onPlan(e.target.value)}
        className="px-3 py-2 rounded-xl text-sm outline-none"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      >
        <option value="ALL">Todos los planes</option>
        {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  )
}

function VisibilidadToggle({ emp, saving, onToggle }) {
  const visible = emp.visibilidadPublica
  return (
    <button type="button"
      onClick={() => onToggle(emp.id, !visible)}
      disabled={saving}
      title={visible ? 'Ocultar negocio' : 'Hacer visible'}
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-opacity disabled:opacity-40"
      style={{
        background: visible ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: visible ? '#4ade80' : '#f87171',
      }}
    >
      {visible ? <><EyeIcon />Visible</> : <><EyeOffIcon />Oculto</>}
    </button>
  )
}

function EmpresaFila({ emp, saving, onToggleVisibilidad, onAbrirDetalle }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
      className="hover:bg-[var(--hc-surface-2)] transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium" style={{ color: 'var(--hc-text)' }}>{nombreVisibleEmpresa(emp)}</div>
        <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{emp.correoEmpresa}</div>
      </td>
      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>{emp.slug}</td>
      <td className="px-4 py-3">
        <span
          title="Modificar desde Ver detalle"
          className={`text-xs font-semibold px-2 py-1 rounded-full cursor-default select-none ${PLAN_COLOR[emp.plan] ?? ''}`}
        >
          {emp.plan || 'Sin plan'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          title="Modificar desde Ver detalle"
          className={`text-xs font-semibold px-2 py-1 rounded-full cursor-default select-none ${ESTADO_COLOR[emp.estadoEmpresa] ?? ''}`}
        >
          {emp.estadoEmpresa}
        </span>
      </td>
      <td className="px-4 py-3">
        <VisibilidadToggle emp={emp} saving={saving} onToggle={onToggleVisibilidad} />
      </td>
      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{formatDateShort(emp.fechaRegistro)}</td>
      <td className="px-4 py-3">
        <button type="button"
          onClick={() => onAbrirDetalle(emp)}
          className="text-xs px-3 py-1 rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          Detalles
        </button>
      </td>
    </tr>
  )
}

function Paginacion({ page, totalPages, filteredCount, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        {filteredCount} empresa{filteredCount === 1 ? '' : 's'} · página {page + 1} de {totalPages}
      </span>
      <div className="flex gap-1">
        <button type="button"
          onClick={() => onPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          <TextoFlecha dir="atras">Anterior</TextoFlecha>
        </button>
        {indicesPagina(page, totalPages).map((idx) => (
          <button type="button"
            key={idx}
            onClick={() => onPage(idx)}
            className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: page === idx ? 'var(--hc-accent)' : 'var(--hc-surface)',
              border: `1px solid ${page === idx ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
              color: page === idx ? '#fff' : 'var(--hc-text)',
            }}
          >
            {idx + 1}
          </button>
        ))}
        <button type="button"
          onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          <TextoFlecha>Siguiente</TextoFlecha>
        </button>
      </div>
    </div>
  )
}

export default function EmpresaList({ empresas, loading, saving, onToggleVisibilidad, onAbrirDetalle }) {
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('ACTIVO')
  const [filtroPlan, setFiltroPlan] = useState('ALL')
  const [page, setPage] = useState(0)

  const filtered = filtrarEmpresas(empresas, { search, filtroEstado, filtroPlan })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function cambiarFiltro(setter) {
    return (valor) => { setter(valor); setPage(0) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Negocios en la plataforma</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Administrá planes, estados y visibilidad de cada emprendedor</p>
      </div>

      <Kpis empresas={empresas} />
      <Filtros
        search={search}
        filtroEstado={filtroEstado}
        filtroPlan={filtroPlan}
        onSearch={cambiarFiltro(setSearch)}
        onEstado={cambiarFiltro(setFiltroEstado)}
        onPlan={cambiarFiltro(setFiltroPlan)}
      />

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
                {COLUMNAS_TABLA.map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasTablaEmpresas(loading, paged, { saving, onToggleVisibilidad, onAbrirDetalle })}
            </tbody>
          </table>
        </div>
      </div>

      <Paginacion page={page} totalPages={totalPages} filteredCount={filtered.length} onPage={setPage} />
    </div>
  )
}

function filasTablaEmpresas(loading, paged, { saving, onToggleVisibilidad, onAbrirDetalle }) {
  if (loading) {
    return <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</td></tr>
  }
  if (paged.length === 0) {
    return <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados</td></tr>
  }
  return paged.map((emp) => (
    <EmpresaFila
      key={emp.id}
      emp={emp}
      saving={saving}
      onToggleVisibilidad={onToggleVisibilidad}
      onAbrirDetalle={onAbrirDetalle}
    />
  ))
}
