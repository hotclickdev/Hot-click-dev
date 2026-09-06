import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  chipsCategoriaImportar,
  filtrarProductosPorChip,
  fmtColones,
  parseColones,
  type CategoriaImportar,
  type EmpresaImportar,
  type MarcaImportar,
  type ProductoImportado,
} from './importarHelpers'
import { IconArrow, IconCheck, IconSpinner } from './importarIcons'

function nombreNegocio(empresa: EmpresaImportar | null): string {
  if (!empresa) return 'Negocio destino'
  return empresa.nombreComercial?.trim()
    || empresa.nombreEmpresa?.trim()
    || `Empresa ${empresa.id}`
}

function CabeceraNegocio({
  empresa,
  total,
  seleccionados,
}: {
  empresa: EmpresaImportar | null
  total: number
  seleccionados: number
}) {
  const nombre = nombreNegocio(empresa)
  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold"
        style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
      >
        {empresa?.logoUrl
          ? <img src={empresa.logoUrl} alt="" className="h-full w-full object-cover" />
          : (nombre[0] ?? 'N').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-lg font-bold" style={{ color: 'var(--hc-text)' }}>
          {nombre}
        </h2>
        {empresa?.slug && (
          <p className="font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{empresa.slug}</p>
        )}
        <p className="mt-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
          {total} producto{total !== 1 ? 's' : ''} extraído{total !== 1 ? 's' : ''}
          {' · '}
          {seleccionados} seleccionado{seleccionados !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}

function ChipsCategoria({
  chips,
  activo,
  onChange,
}: {
  chips: { id: string; label: string; cantidad: number }[]
  activo: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar por categoría">
      {chips.map((chip) => {
        const selected = chip.id === activo
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(chip.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: selected ? 'var(--hc-accent)' : 'var(--hc-surface)',
              color: selected ? '#fff' : 'var(--hc-text)',
              border: `1px solid ${selected ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            }}
          >
            {chip.label}
            <span className="ml-1 opacity-80">({chip.cantidad})</span>
          </button>
        )
      })}
    </div>
  )
}

function ProductoCard({
  producto,
  categorias,
  updateRow,
}: {
  producto: ProductoImportado
  categorias: CategoriaImportar[]
  updateRow: <K extends keyof ProductoImportado>(id: number, field: K, value: ProductoImportado[K]) => void
}) {
  const faltaNombre = !producto.nombreProducto?.trim()
  const faltaCategoria = !producto.categoriaId
  const precioZero = producto._sel && (producto.precioVenta ?? 0) === 0
  const alerta = producto._sel && (faltaNombre || faltaCategoria || precioZero)

  return (
    <article
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        backgroundColor: 'var(--hc-surface)',
        border: `1px solid ${alerta ? 'rgba(245,158,11,0.45)' : 'var(--hc-border)'}`,
        opacity: producto._sel ? 1 : 0.55,
      }}
    >
      <div className="relative aspect-square bg-black/10">
        {producto.imagenPrincipalUrl
          ? <img src={producto.imagenPrincipalUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          : (
            <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: 'var(--hc-muted)' }}>
              Sin imagen
            </div>
          )}
        <label className="absolute left-2 top-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg bg-black/50">
          <input
            type="checkbox"
            checked={producto._sel}
            onChange={(e) => updateRow(producto._id, '_sel', e.target.checked)}
            className="h-4 w-4 accent-[var(--hc-accent)]"
            aria-label={`Incluir ${producto.nombreProducto || 'producto'}`}
          />
        </label>
        {producto._colorLabel && (
          <span
            className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: producto._colorHex ?? 'rgba(0,0,0,0.65)' }}
          >
            {producto._colorLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <input
          value={producto.nombreProducto ?? ''}
          onChange={(e) => updateRow(producto._id, 'nombreProducto', e.target.value)}
          placeholder="Nombre del producto"
          className="w-full rounded-lg px-2 py-1.5 text-sm font-medium outline-none"
          style={{
            backgroundColor: faltaNombre && producto._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
            border: `1px solid ${faltaNombre && producto._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
            color: 'var(--hc-text)',
          }}
        />

        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
          Precio venta (₡)
          <input
            value={producto._ventaFmt ?? ''}
            onChange={(e) => {
              updateRow(producto._id, 'precioVenta', parseColones(e.target.value))
              updateRow(producto._id, '_ventaFmt', e.target.value)
            }}
            onBlur={() => updateRow(producto._id, '_ventaFmt', fmtColones(producto.precioVenta))}
            placeholder="0"
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: precioZero ? 'rgba(245,158,11,0.08)' : 'var(--hc-surface-2)',
              border: `1px solid ${precioZero ? 'rgba(245,158,11,0.4)' : 'transparent'}`,
              color: 'var(--hc-text)',
            }}
          />
        </label>

        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
          Categoría
          <select
            value={producto.categoriaId ?? ''}
            onChange={(e) => updateRow(producto._id, 'categoriaId', e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs outline-none"
            style={{
              backgroundColor: faltaCategoria && producto._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
              border: `1px solid ${faltaCategoria && producto._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
              color: producto.categoriaId ? 'var(--hc-text)' : 'var(--hc-muted)',
            }}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreCategoria}</option>
            ))}
          </select>
        </label>
      </div>
    </article>
  )
}

export default function ImportarResultados({
  empresa,
  productos,
  categorias,
  updateRow,
  onVolver,
  onConfirmar,
  guardando,
}: {
  empresa: EmpresaImportar | null
  productos: ProductoImportado[]
  setProductos: Dispatch<SetStateAction<ProductoImportado[]>>
  categorias: CategoriaImportar[]
  marcas: MarcaImportar[]
  updateRow: <K extends keyof ProductoImportado>(id: number, field: K, value: ProductoImportado[K]) => void
  onVolver: () => void
  onConfirmar: () => void
  guardando: boolean
}) {
  const seleccionados = productos.filter((p) => p._sel)
  const [chipActivo, setChipActivo] = useState('todas')

  const chips = useMemo(
    () => chipsCategoriaImportar(productos, categorias),
    [productos, categorias],
  )

  const chipValido = chips.some((c) => c.id === chipActivo) ? chipActivo : 'todas'

  const lista = useMemo(
    () => filtrarProductosPorChip(productos, chipValido),
    [productos, chipValido],
  )

  return (
    <div className="space-y-4">
      <CabeceraNegocio
        empresa={empresa}
        total={productos.length}
        seleccionados={seleccionados.length}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
          Categorías
        </p>
        <ChipsCategoria
          chips={chips}
          activo={chipValido}
          onChange={setChipActivo}
        />
      </div>

      {lista.length === 0 ? (
        <p className="rounded-xl px-4 py-10 text-center text-sm" style={{ color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
          No hay productos en esta categoría.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((p) => (
            <ProductoCard
              key={p._id}
              producto={p}
              categorias={categorias}
              updateRow={updateRow}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          <IconArrow /> Volver
        </button>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={guardando || seleccionados.length === 0}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          {guardando
            ? <><IconSpinner /> Importando…</>
            : <><IconCheck /> Importar {seleccionados.length} producto{seleccionados.length !== 1 ? 's' : ''}</>}
        </button>
      </div>
    </div>
  )
}
