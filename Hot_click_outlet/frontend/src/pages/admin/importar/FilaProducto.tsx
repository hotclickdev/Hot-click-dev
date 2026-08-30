import { CONDICIONES, fmtColones, parseColones } from './importarHelpers'
import type { CategoriaImportar, MarcaImportar, ProductoImportado } from './importarHelpers'
import { IconEye, IconImg, IconWarn } from './importarIcons'
import ImgPreview from './ImgPreview'

// Fila de detalle de un producto individual (una variante/color específico).
// Se usa tanto para productos sin variantes de color como para el detalle expandido de un grupo.
export default function FilaProducto({ p, isLast, categorias, marcas, updateRow }: {
  p: ProductoImportado
  isLast: boolean
  categorias: CategoriaImportar[]
  marcas: MarcaImportar[]
  updateRow: <K extends keyof ProductoImportado>(id: number, field: K, value: ProductoImportado[K]) => void
}) {
  const faltaNombre    = !p.nombreProducto?.trim()
  const faltaCategoria = !p.categoriaId
  const precioZero     = p._sel && (p.precioVenta ?? 0) === 0
  const tieneAlerta    = p._sel && (faltaNombre || faltaCategoria || precioZero)

  return (
    <div
      className="grid items-start px-3 py-3 gap-x-2 min-w-[990px]"
      style={{
        gridTemplateColumns: '28px 1fr 95px 95px 125px 105px 90px 60px 28px',
        borderBottom: isLast ? 'none' : '1px solid var(--hc-border)',
        backgroundColor: tieneAlerta ? 'rgba(245,158,11,0.04)' : 'transparent',
        opacity: p._sel ? 1 : 0.4,
      }}>

      {/* Checkbox */}
      <div className="pt-1.5 flex justify-center">
        <input type="checkbox" checked={p._sel}
          onChange={e => updateRow(p._id, '_sel', e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-[var(--hc-accent)]" />
      </div>

      {/* Nombre + descripción + imagen */}
      <div className="space-y-1 min-w-0">
        {p._colorLabel && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'var(--hc-muted)' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p._colorHex ?? '#999', border: '1px solid var(--hc-border)' }} />
            {p._colorLabel}
          </div>
        )}
        <input
          value={p.nombreProducto ?? ''}
          onChange={e => updateRow(p._id, 'nombreProducto', e.target.value)}
          placeholder="Nombre del producto"
          className="w-full text-sm font-medium px-2 py-1 rounded-lg outline-none"
          style={{
            backgroundColor: faltaNombre && p._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
            border: `1px solid ${faltaNombre && p._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
            color: 'var(--hc-text)',
          }} />
        <input
          value={p.descripcionCorta ?? ''}
          onChange={e => updateRow(p._id, 'descripcionCorta', e.target.value)}
          placeholder="Descripción breve…"
          className="w-full text-xs px-2 py-1 rounded-lg outline-none"
          style={{ backgroundColor: 'transparent', color: 'var(--hc-muted)' }} />

        {/* Imagen URL editable + preview inline */}
        <div className="flex items-center gap-1.5">
          {/* Thumbnail inline */}
          <ImgPreview url={p.imagenPrincipalUrl} />

          <div className="flex-1 flex items-center gap-1">
            <span style={{ color: 'var(--hc-muted)' }}><IconImg /></span>
            <input
              value={p.imagenPrincipalUrl ?? ''}
              onChange={e => updateRow(p._id, 'imagenPrincipalUrl', e.target.value || null)}
              placeholder="https://... (URL imagen)"
              className="flex-1 text-[11px] px-2 py-0.5 rounded-lg outline-none"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid transparent' }} />
            {p.imagenPrincipalUrl && (
              <a href={p.imagenPrincipalUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--hc-muted)' }} title="Ver imagen">
                <IconEye />
              </a>
            )}
          </div>
        </div>

        {tieneAlerta && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400">
            <IconWarn />
            {alertaFilaProducto(faltaNombre, faltaCategoria)}
          </div>
        )}
      </div>

      {/* Precio venta */}
      <div>
        <input
          value={p._ventaFmt ?? ''}
          onChange={e => { updateRow(p._id, 'precioVenta', parseColones(e.target.value)); updateRow(p._id, '_ventaFmt', e.target.value) }}
          onBlur={() => updateRow(p._id, '_ventaFmt', fmtColones(p.precioVenta))}
          placeholder="0"
          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-right"
          style={{
            backgroundColor: precioZero ? 'rgba(245,158,11,0.08)' : 'var(--hc-surface-2)',
            border: `1px solid ${precioZero ? 'rgba(245,158,11,0.4)' : 'transparent'}`,
            color: 'var(--hc-text)',
          }} />
        <p className="text-[9px] text-right mt-0.5" style={{ color: 'var(--hc-muted)' }}>₡ venta</p>
      </div>

      {/* Precio costo */}
      <div>
        <input
          value={p._costoFmt ?? ''}
          onChange={e => { updateRow(p._id, 'precioCompra', parseColones(e.target.value)); updateRow(p._id, '_costoFmt', e.target.value) }}
          onBlur={() => updateRow(p._id, '_costoFmt', fmtColones(p.precioCompra))}
          placeholder="0"
          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-right"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }} />
        <p className="text-[9px] text-right mt-0.5" style={{ color: 'var(--hc-muted)' }}>₡ costo</p>
      </div>

      {/* Categoría */}
      <div>
        <select
          value={p.categoriaId ?? ''}
          onChange={e => updateRow(p._id, 'categoriaId', e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{
            backgroundColor: faltaCategoria && p._sel ? 'rgba(239,68,68,0.08)' : 'var(--hc-surface-2)',
            border: `1px solid ${faltaCategoria && p._sel ? 'rgba(239,68,68,0.4)' : 'transparent'}`,
            color: p.categoriaId ? 'var(--hc-text)' : 'var(--hc-muted)',
          }}>
          <option value="">Sin categoría</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombreCategoria}</option>)}
        </select>
      </div>

      {/* Marca */}
      <div>
        <select
          value={p.marcaId ?? ''}
          onChange={e => updateRow(p._id, 'marcaId', e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }}>
          <option value="">{p.marcaTexto || 'Sin marca'}</option>
          {marcas.map(m => <option key={m.id} value={m.id}>{m.nombreMarca}</option>)}
        </select>
      </div>

      {/* Condición */}
      <div>
        <select
          value={p.condicion ?? 'NUEVO'}
          onChange={e => updateRow(p._id, 'condicion', e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }}>
          {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Stock */}
      <div>
        <input type="number" min="0"
          value={p.stockActual ?? 0}
          onChange={e => updateRow(p._id, 'stockActual', Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="w-full text-sm px-2 py-1.5 rounded-lg outline-none text-center"
          style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid transparent' }} />
      </div>

      {/* Espaciador (columna de expandir, solo existe en la cabecera del grupo) */}
      <span />
    </div>
  )
}

function alertaFilaProducto(faltaNombre: boolean, faltaCategoria: boolean) {
  if (faltaNombre) return 'Nombre requerido'
  if (faltaCategoria) return 'Seleccioná una categoría'
  return 'Precio de venta en ₡0'
}
